// Tunable safety limits for the realtime layer — the OOM / abuse defenses from
// docs/09. All overridable via env so they can be tightened per environment.
export const wsLimits = {
  maxFrameBytes: Number(process.env.WS_MAX_PAYLOAD) || 262144, // 256 KB (also enforced at the transport)
  maxMessagesPerSec: Number(process.env.WS_MAX_MSGS_PER_SEC) || 120,
  maxBytesPerSec: Number(process.env.WS_MAX_BYTES_PER_SEC) || 1_048_576, // 1 MB/s
  maxPendingFrames: 512, // cap frames buffered during a cold load (flood guard)
  maxStrikes: 5, // rate-limit violations before the connection is dropped
  maxConnsPerUser: 12, // bound fan-out from a single account (across rooms)
  maxRooms: 2000, // bound in-memory rooms per process
  maxAwarenessClients: 16, // client-ids allowed in one awareness frame (anti-flood; a real client sends 1)
  maxBufferedBytes: 8_388_608, // 8 MB: drop a connection whose send buffer backs up (backpressure)
  roleRecheckMs: 30000 // re-validate a live socket's role on this cadence (revocation window)
}

// Per-user connection slots, counted across all rooms in this process.
const userConnectionCounts = new Map<string, number>()

export const acquireUserSlot = (userId: string): boolean => {
  const current = userConnectionCounts.get(userId) ?? 0
  if (current >= wsLimits.maxConnsPerUser) return false
  userConnectionCounts.set(userId, current + 1)
  return true
}

export const releaseUserSlot = (userId: string) => {
  const current = userConnectionCounts.get(userId) ?? 0
  if (current <= 1) userConnectionCounts.delete(userId)
  else userConnectionCounts.set(userId, current - 1)
}

// Sliding 1-second rate window for one connection.
export interface RateWindow {
  windowStart: number
  messages: number
  bytes: number
  strikes: number
}

export const createRateWindow = (now: number): RateWindow => ({
  windowStart: now,
  messages: 0,
  bytes: 0,
  strikes: 0
})

// Record a frame; returns false if it breaches the per-second budget (caller strikes).
export const withinRate = (win: RateWindow, size: number, now: number): boolean => {
  if (now - win.windowStart >= 1000) {
    win.windowStart = now
    win.messages = 0
    win.bytes = 0
  }
  win.messages += 1
  win.bytes += size
  return win.messages <= wsLimits.maxMessagesPerSec && win.bytes <= wsLimits.maxBytesPerSec
}
