import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { httpStatusConstant, messageConstant, documentRole, snapshotKind } from '@/lib/constants'
import { requireRole } from '@/lib/auth/guards'
import { NotFoundError } from '@/lib/errors'
import { versionsListDTO } from '@/lib/dtos/version'
import type { CreateVersionInput } from '@/lib/validators/version'

// Save a snapshot of the current document content (Editor+).
export const createVersion = async (
  userId: string,
  documentId: string,
  input: CreateVersionInput
) => {
  await requireRole(userId, documentId, documentRole.EDITOR)
  const snapshot = await prisma.documentSnapshot.create({
    data: {
      documentId,
      label: input.label,
      kind: snapshotKind.MANUAL,
      content: input.content as Prisma.InputJsonValue,
      createdById: userId
    }
  })
  return {
    statusCode: httpStatusConstant.CREATED,
    message: messageConstant.VERSION_CREATED,
    data: { id: snapshot.id }
  }
}

// The version timeline (Viewer+). Metadata only — content is fetched per-version.
export const listVersions = async (userId: string, documentId: string) => {
  await requireRole(userId, documentId, documentRole.VIEWER)
  const snapshots = await prisma.documentSnapshot.findMany({
    where: {
      documentId,
      kind: { in: [snapshotKind.MANUAL, snapshotKind.AUTO] }
    },
    include: { createdBy: true },
    orderBy: { createdAt: 'desc' }
  })
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.VERSIONS_RETRIEVED,
    data: versionsListDTO(snapshots)
  }
}

// One version's content, for preview or restore (Viewer+). Scoped by documentId
// so a version id from another document can't be fetched (tenant isolation).
export const getVersion = async (userId: string, documentId: string, versionId: string) => {
  await requireRole(userId, documentId, documentRole.VIEWER)
  const snapshot = await prisma.documentSnapshot.findFirst({
    where: {
      id: versionId,
      documentId,
      kind: { in: [snapshotKind.MANUAL, snapshotKind.AUTO] } // never expose internal COMPACTION snapshots
    }
  })
  if (!snapshot || snapshot.content === null)
    throw new NotFoundError(messageConstant.VERSION_NOT_FOUND)
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.VERSIONS_RETRIEVED,
    data: { id: snapshot.id, label: snapshot.label, content: snapshot.content }
  }
}
