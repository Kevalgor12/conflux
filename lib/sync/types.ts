// Document roles (mirrors the Prisma Role enum) — client-safe string union.
export type DocumentRole = 'OWNER' | 'EDITOR' | 'VIEWER'

// The connection/sync states the UI surfaces (see docs/02 §7, docs/05 §4).
export type SyncState =
  | 'offline'
  | 'connecting'
  | 'reconnecting'
  | 'syncing'
  | 'synced'
  | 'readonly'
  | 'error'
