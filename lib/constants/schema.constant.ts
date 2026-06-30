// Document role values — mirror the Prisma `Role` enum
const documentRole = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER'
} as const

// Snapshot kinds — mirror the Prisma `SnapshotKind` enum
const snapshotKind = {
  MANUAL: 'MANUAL',
  AUTO: 'AUTO',
  COMPACTION: 'COMPACTION'
} as const

// Role ranking for "at least this role" checks (Owner > Editor > Viewer)
const roleRank = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3
} as const

export { documentRole, snapshotKind, roleRank }
