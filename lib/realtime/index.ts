import type { Server } from 'node:http'
import { parse } from 'node:url'
import { WebSocketServer } from 'ws'
import { setupConnection } from './connection'
import { getUserIdFromCookieHeader } from '../auth/ws-token'
import { resolveRole } from '../auth/guards'
import { hasRoom, roomCount } from './room'
import { wsLimits, acquireUserSlot, releaseUserSlot } from './limits'

const REALTIME_PATH = '/api/realtime'

// Reject cross-origin WebSocket upgrades (CSWSH defense). Browsers always send an
// Origin header, so a forged cross-site connection is caught here; non-browser clients
// (no Origin) are allowed. Extra origins can be allow-listed via WS_ALLOWED_ORIGINS.
const isAllowedOrigin = (req: {
  headers: Record<string, string | string[] | undefined>
}): boolean => {
  const origin = req.headers.origin
  if (!origin || typeof origin !== 'string') return true
  let url: URL
  try {
    url = new URL(origin)
  } catch {
    return false
  }
  const allow = (process.env.WS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (allow.includes(origin) || allow.includes(url.host)) return true
  // Same-origin. Behind a proxy (e.g. Railway) the public host arrives in
  // x-forwarded-host, not host — accept either.
  const forwarded = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim()
  const host = typeof req.headers.host === 'string' ? req.headers.host : ''
  return [host, forwarded].filter(Boolean).includes(url.host)
}

// Attach the realtime WebSocket layer to the existing HTTP server. Every upgrade is
// authenticated (Auth.js cookie) and authorized (document membership) BEFORE the
// socket is accepted — non-members are rejected (tenant isolation), Viewers connect
// read-only. See docs/02, docs/03 ADR-4, docs/08.
export const attachRealtime = (server: Server) => {
  const maxPayload = wsLimits.maxFrameBytes
  const wss = new WebSocketServer({ noServer: true, maxPayload })

  server.on('upgrade', (req, socket, head) => {
    const { pathname, query } = parse(req.url || '', true)

    // Only handle our path — everything else (e.g. Next.js HMR) is left untouched.
    if (pathname !== REALTIME_PATH) return

    const documentId = typeof query.doc === 'string' ? query.doc : ''
    if (!documentId) {
      socket.destroy()
      return
    }

    // Cross-origin WebSocket hijacking guard.
    if (!isAllowedOrigin(req)) {
      socket.destroy()
      return
    }

    void (async () => {
      try {
        const userId = await getUserIdFromCookieHeader(req.headers.cookie)
        if (!userId) {
          socket.destroy() // unauthenticated
          return
        }
        const role = await resolveRole(userId, documentId)
        if (!role) {
          socket.destroy() // not a member of this document (tenant isolation)
          return
        }
        // Cap in-memory rooms (don't spin up an unbounded number of fresh rooms).
        if (!hasRoom(documentId) && roomCount() >= wsLimits.maxRooms) {
          socket.destroy()
          return
        }
        // Bound concurrent connections per user (across rooms).
        if (!acquireUserSlot(userId)) {
          socket.destroy()
          return
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          setupConnection(ws, documentId, role, userId).catch((error) => {
            console.error('[realtime] setup failed:', (error as Error).message)
            // The slot is released by the connection's close handler; close to trigger it.
            try {
              ws.close()
            } catch {
              releaseUserSlot(userId)
            }
          })
        })
      } catch (error) {
        console.error('[realtime] upgrade auth failed:', (error as Error).message)
        socket.destroy()
      }
    })()
  })

  console.log(`[realtime] WebSocket layer attached at ${REALTIME_PATH} (maxPayload=${maxPayload})`)
}
