import type { DocumentSnapshot, User } from '@prisma/client'

type SnapshotWithUser = DocumentSnapshot & { createdBy: User | null }

export interface VersionListItem {
  id: string | null
  label: string
  kind: string | null
  createdByName: string | null
  createdAt: Date | null
}

export const versionDTO = (snapshot: SnapshotWithUser): VersionListItem => ({
  id: snapshot?.id || null,
  label: snapshot?.label || 'Untitled version',
  kind: snapshot?.kind || null,
  createdByName: snapshot?.createdBy?.name || snapshot?.createdBy?.email || null,
  createdAt: snapshot?.createdAt || null
})

export const versionsListDTO = (snapshots: SnapshotWithUser[]): VersionListItem[] => {
  if (!snapshots?.length) return []
  return snapshots.map(versionDTO)
}
