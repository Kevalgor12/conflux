import type { WebSocket } from 'ws'
import type { Role } from '@prisma/client'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import * as syncProtocol from 'y-protocols/sync'
import * as awarenessProtocol from 'y-protocols/awareness'
import { MESSAGE_SYNC, MESSAGE_AWARENESS } from './messages'
import { getRoom, type Room } from './room'
import { send } from './send'
import { documentRole } from '../constants'
import { resolveRole } from '../auth/guards'
import { wsLimits, releaseUserSlot, createRateWindow, withinRate, type RateWindow } from './limits'

// Keepalive + role re-validation cadence (configurable so it can be tightened/tested).
const PING_INTERVAL_MS = Number(process.env.WS_PING_INTERVAL_MS) || 30000

// Wire an authenticated, rate-limited socket into its document room. `role` decides
// whether this connection may write; `userId` owns a connection slot (released on close).
export const setupConnection = async (
  ws: WebSocket,
  documentId: string,
  role: Role,
  userId: string
) => {
  const room = getRoom(documentId)

  // Authorization is resolved at the upgrade, but membership can change while the
  // socket is open. Keep it mutable and re-validate on the ping cadence so a demoted
  // Editor loses write access (and a removed member is dropped) within one interval.
  let currentRole = role

  // Single cleanup path (close or setup failure): release the slot + leave the room.
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let released = false
  const cleanup = () => {
    if (released) return
    released = true
    if (pingTimer) clearInterval(pingTimer)
    room.removeConn(ws)
    releaseUserSlot(userId)
  }
  ws.on('close', cleanup)

  room.addConn(ws)

  // Buffer inbound frames until the room's durable state has loaded (capped to
  // avoid an unbounded buffer during a cold load — flood guard).
  let ready = false
  const pending: Uint8Array[] = []
  const handleFrame = (data: Uint8Array) => {
    try {
      onMessage(ws, room, currentRole, data)
    } catch (error) {
      console.error('[realtime] message error:', (error as Error).message)
    }
  }

  // Per-connection rate limiting (messages/sec + bytes/sec) with a strike budget.
  const rate: RateWindow = createRateWindow(Date.now())

  ws.on('message', (data: Buffer) => {
    const frame = new Uint8Array(data)

    // Explicit oversize guard (the transport maxPayload also enforces this).
    if (frame.byteLength > wsLimits.maxFrameBytes) {
      rate.strikes += 1
      if (rate.strikes >= wsLimits.maxStrikes) ws.close(1009, 'oversize')
      return
    }

    // Rate budget — drop offending frames, ban repeat offenders.
    if (!withinRate(rate, frame.byteLength, Date.now())) {
      rate.strikes += 1
      if (rate.strikes >= wsLimits.maxStrikes) {
        console.warn(`[realtime] rate-limit drop on doc ${documentId} (user ${userId})`)
        ws.close(1008, 'rate limit exceeded')
      }
      return
    }

    if (ready) {
      handleFrame(frame)
    } else if (pending.length < wsLimits.maxPendingFrames) {
      pending.push(frame)
    } else {
      ws.close(1009, 'pre-sync buffer overflow')
    }
  })

  // Keepalive: terminate connections that stop responding to pings.
  let alive = true
  ws.on('pong', () => {
    alive = true
  })
  pingTimer = setInterval(() => {
    if (!alive) {
      ws.terminate()
      return
    }
    alive = false
    try {
      ws.ping()
    } catch {
      ws.terminate()
      return
    }
    // Re-validate authorization: drop a now-removed member, downgrade a demoted one.
    void resolveRole(userId, documentId)
      .then((latest) => {
        if (!latest) ws.close(1008, 'access revoked')
        else currentRole = latest
      })
      .catch(() => {})
  }, PING_INTERVAL_MS)

  // Wait for durable state before the handshake so the client gets the full doc.
  await room.whenLoaded

  // Sync step 1 — send our state vector; the client replies with what we're missing.
  const syncEncoder = encoding.createEncoder()
  encoding.writeVarUint(syncEncoder, MESSAGE_SYNC)
  syncProtocol.writeSyncStep1(syncEncoder, room.doc)
  send(ws, encoding.toUint8Array(syncEncoder))

  // Send the current presence state so the newcomer sees who else is here.
  const states = room.awareness.getStates()
  if (states.size > 0) {
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      awarenessEncoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys()))
    )
    send(ws, encoding.toUint8Array(awarenessEncoder))
  }

  // Drain any frames that arrived during the load, then go live.
  ready = true
  for (const frame of pending) handleFrame(frame)
  pending.length = 0
}

const onMessage = (ws: WebSocket, room: Room, role: Role, message: Uint8Array) => {
  const decoder = decoding.createDecoder(message)
  const messageType = decoding.readVarUint(decoder)

  switch (messageType) {
    case MESSAGE_SYNC: {
      // Branch on the sync sub-type so we can enforce read-only for Viewers.
      const syncType = decoding.readVarUint(decoder)

      if (syncType === syncProtocol.messageYjsSyncStep1) {
        // A read request — reply with our state (step 2). Allowed for everyone.
        const encoder = encoding.createEncoder()
        encoding.writeVarUint(encoder, MESSAGE_SYNC)
        syncProtocol.readSyncStep1(decoder, encoder, room.doc)
        send(ws, encoding.toUint8Array(encoder))
        return
      }

      if (
        syncType === syncProtocol.messageYjsSyncStep2 ||
        syncType === syncProtocol.messageYjsUpdate
      ) {
        // A write — M3: Viewers must not push state updates to the realtime server.
        if (role === documentRole.VIEWER) {
          console.warn(`[realtime] rejected viewer write on doc ${room.documentId}`)
          return
        }
        // origin = ws → room.doc's update handler broadcasts to peers + persists.
        if (syncType === syncProtocol.messageYjsSyncStep2) {
          syncProtocol.readSyncStep2(decoder, room.doc, ws)
        } else {
          syncProtocol.readUpdate(decoder, room.doc, ws)
        }
      }
      break
    }
    case MESSAGE_AWARENESS: {
      // Presence is allowed for everyone (including Viewers). Guard against a single
      // frame injecting many fake client-ids to bloat the awareness map (a real client
      // reports only its own id).
      const update = decoding.readVarUint8Array(decoder)
      const clientCount = decoding.readVarUint(decoding.createDecoder(update))
      if (clientCount > wsLimits.maxAwarenessClients) {
        console.warn(`[realtime] dropped oversized awareness frame on doc ${room.documentId}`)
        return
      }
      awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws)
      break
    }
    default:
      break
  }
}
