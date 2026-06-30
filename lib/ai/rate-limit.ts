// Simple per-user sliding-window rate limiter for AI endpoints (in-process).
const hits = new Map<string, number[]>()

export const checkAiRate = (userId: string, max = 20, windowMs = 60000): boolean => {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(userId, recent)
    return false
  }
  recent.push(now)
  hits.set(userId, recent)
  return true
}
