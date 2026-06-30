// Presence identity (awareness). The authenticated user supplies this; createIdentity
// is the anonymous fallback (e.g. before a name is known).
export interface UserIdentity {
  name: string
  color: string
}

const COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316'
]

const ADJECTIVES = ['Swift', 'Calm', 'Bright', 'Bold', 'Keen', 'Quiet', 'Lively', 'Brave']
const ANIMALS = ['Otter', 'Falcon', 'Fox', 'Heron', 'Lynx', 'Wren', 'Ibis', 'Marten']

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)]

export const createIdentity = (): UserIdentity => ({
  name: `${pick(ADJECTIVES)} ${pick(ANIMALS)}`,
  color: pick(COLORS)
})

// Deterministic colour from a stable seed (e.g. the user id), so a person keeps
// the same presence colour across sessions.
export const colorFromString = (value: string): string => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export const identityFromUser = (name: string, seed: string): UserIdentity => ({
  name,
  color: colorFromString(seed)
})
