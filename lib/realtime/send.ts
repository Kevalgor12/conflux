import type { WebSocket } from 'ws'
import { wsLimits } from './limits'

const READY_STATE_OPEN = 1

// Low-level frame send with a guard + cleanup on failure (kept separate to avoid
// a circular dependency between room.ts and connection.ts).
export const send = (ws: WebSocket, message: Uint8Array) => {
  if (ws.readyState !== READY_STATE_OPEN) return
  // Backpressure: a client that can't keep up would otherwise balloon the server's
  // send buffer. Drop it once the buffer backs up past the cap.
  if (ws.bufferedAmount > wsLimits.maxBufferedBytes) {
    try {
      ws.close(1009, 'backpressure')
    } catch {
      // ignore
    }
    return
  }
  try {
    ws.send(message)
  } catch (error) {
    console.error('[realtime] send failed:', (error as Error).message)
    try {
      ws.close()
    } catch {
      // ignore
    }
  }
}
