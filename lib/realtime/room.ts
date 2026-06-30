import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import type { WebSocket } from 'ws'
import { MESSAGE_SYNC, MESSAGE_AWARENESS } from './messages'
import {
  loadDoc,
  storeUpdate,
  compactDocument,
  countUpdates,
  PERSISTENCE_ORIGIN
} from './persistence'
import { send } from './send'
import { mergeUpdates } from '../crdt/sync'

const PERSIST_DEBOUNCE_MS = 2000
const EMPTY_ROOM_GRACE_MS = 30000
// Fold the update log into a snapshot after this many appended rows (bounds cold-load).
const COMPACT_AFTER_UPDATES = Number(process.env.WS_COMPACT_AFTER_UPDATES) || 100

// A room is one document's authoritative in-memory state: a single Y.Doc, the
// awareness (presence) state, and the set of connected clients. One room per docId.
export class Room {
  documentId: string
  doc: Y.Doc
  awareness: awarenessProtocol.Awareness
  conns: Map<WebSocket, Set<number>> = new Map()
  whenLoaded: Promise<void>

  private pending: Uint8Array[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private gcTimer: NodeJS.Timeout | null = null
  private updatesSinceCompaction = 0

  constructor(documentId: string) {
    this.documentId = documentId
    this.doc = new Y.Doc()
    this.awareness = new awarenessProtocol.Awareness(this.doc)
    this.doc.on('update', this.handleDocUpdate)
    this.awareness.on('update', this.handleAwarenessUpdate)
    // Load durable state, then compact immediately if the log is already large
    // (keeps cold-load fast for long-lived documents).
    this.whenLoaded = loadDoc(documentId, this.doc).then(async () => {
      if ((await countUpdates(documentId)) >= COMPACT_AFTER_UPDATES) {
        await compactDocument(documentId, this.doc)
      }
    })
  }

  addConn(conn: WebSocket) {
    if (this.gcTimer) {
      clearTimeout(this.gcTimer)
      this.gcTimer = null
    }
    this.conns.set(conn, new Set())
  }

  removeConn(conn: WebSocket) {
    const controlled = this.conns.get(conn)
    this.conns.delete(conn)
    // Drop the awareness state(s) this connection owned (so peers see them leave).
    if (controlled && controlled.size > 0) {
      awarenessProtocol.removeAwarenessStates(this.awareness, Array.from(controlled), null)
    }
    if (this.conns.size === 0) {
      void this.flushNow()
      this.scheduleGc()
    }
  }

  // Broadcast a CRDT update to everyone except its originator, and queue it for persistence.
  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === PERSISTENCE_ORIGIN) return // historical update we just loaded — already durable

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    const message = encoding.toUint8Array(encoder)
    this.conns.forEach((_, conn) => {
      if (conn !== origin) send(conn, message)
    })

    this.pending.push(update)
    this.scheduleFlush()
  }

  // Fan out presence changes to all connections and track which ids each conn owns.
  private handleAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) => {
    const conn = origin as WebSocket
    const controlled = this.conns.get(conn)
    if (controlled) {
      changes.added.forEach((id) => controlled.add(id))
      changes.removed.forEach((id) => controlled.delete(id))
    }

    const changed = changes.added.concat(changes.updated, changes.removed)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changed)
    )
    const message = encoding.toUint8Array(encoder)
    this.conns.forEach((_, c) => send(c, message))
  }

  private scheduleFlush() {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => void this.flushNow(), PERSIST_DEBOUNCE_MS)
  }

  // Merge buffered updates into one row to avoid a DB write per keystroke. On a
  // failed write the merged batch is re-queued so the next flush retries it — we
  // never drop updates that were already acknowledged to clients.
  private async flushNow() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.pending.length === 0) return
    const batch = this.pending
    this.pending = []
    const merged = mergeUpdates(batch)
    const ok = await storeUpdate(this.documentId, merged)
    if (!ok) {
      this.pending.unshift(merged) // re-queue...
      this.scheduleFlush() // ...and ensure a retry fires even without a new edit
      return
    }
    // Compact once enough rows have accumulated.
    this.updatesSinceCompaction += 1
    if (this.updatesSinceCompaction >= COMPACT_AFTER_UPDATES) {
      this.updatesSinceCompaction = 0
      void compactDocument(this.documentId, this.doc)
    }
  }

  private scheduleGc() {
    if (this.gcTimer) clearTimeout(this.gcTimer)
    this.gcTimer = setTimeout(() => {
      if (this.conns.size === 0) void deleteRoom(this.documentId)
    }, EMPTY_ROOM_GRACE_MS)
  }

  // Flush durably before tearing down so a soon-to-be-GC'd room never loses its log.
  async destroy() {
    await this.flushNow()
    if (this.gcTimer) clearTimeout(this.gcTimer)
    this.doc.off('update', this.handleDocUpdate)
    this.awareness.off('update', this.handleAwarenessUpdate)
    this.awareness.destroy()
    this.doc.destroy()
  }
}

// ---- Room registry (one process holds the active rooms) ----
const rooms = new Map<string, Room>()

export const getRoom = (documentId: string): Room => {
  let room = rooms.get(documentId)
  if (!room) {
    room = new Room(documentId)
    rooms.set(documentId, room)
  }
  return room
}

export const hasRoom = (documentId: string) => rooms.has(documentId)

export const roomCount = () => rooms.size

export const deleteRoom = async (documentId: string) => {
  const room = rooms.get(documentId)
  if (!room) return
  // Remove from the registry first so a late reconnect creates a fresh room
  // instead of using one that's being torn down.
  rooms.delete(documentId)
  await room.destroy()
}
