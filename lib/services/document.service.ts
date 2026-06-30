import { prisma } from '@/lib/db'
import { httpStatusConstant, messageConstant, documentRole } from '@/lib/constants'
import { requireRole } from '@/lib/auth/guards'
import { NotFoundError } from '@/lib/errors'
import { documentDTO, documentsListDTO } from '@/lib/dtos/document'
import type { CreateDocumentInput, RenameDocumentInput } from '@/lib/validators/document'

// All documents the user can see (any membership), most-recently-updated first.
export const listDocuments = async (userId: string) => {
  const memberships = await prisma.documentMembership.findMany({
    where: { userId },
    include: { document: true },
    orderBy: { document: { updatedAt: 'desc' } }
  })
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.DOCUMENTS_RETRIEVED,
    data: documentsListDTO(memberships)
  }
}

// Create a document and make the creator its Owner (single transaction via nested write).
export const createDocument = async (userId: string, input: CreateDocumentInput) => {
  const document = await prisma.document.create({
    data: {
      title: input.title || 'Untitled',
      ownerId: userId,
      memberships: { create: { userId, role: documentRole.OWNER } }
    }
  })
  return {
    statusCode: httpStatusConstant.CREATED,
    message: messageConstant.DOCUMENT_CREATED,
    data: documentDTO(document, documentRole.OWNER)
  }
}

// Fetch a document's metadata + the caller's role (Viewer+ required).
export const getDocument = async (userId: string, documentId: string) => {
  const role = await requireRole(userId, documentId, documentRole.VIEWER)
  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document) throw new NotFoundError(messageConstant.DOCUMENT_NOT_FOUND)
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.DOCUMENT_RETRIEVED,
    data: documentDTO(document, role)
  }
}

// Rename (Editor+).
export const renameDocument = async (
  userId: string,
  documentId: string,
  input: RenameDocumentInput
) => {
  const role = await requireRole(userId, documentId, documentRole.EDITOR)
  const document = await prisma.document.update({
    where: { id: documentId },
    data: { title: input.title }
  })
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.DOCUMENT_UPDATED,
    data: documentDTO(document, role)
  }
}

// Delete (Owner only). Cascades memberships/updates/snapshots.
export const deleteDocument = async (userId: string, documentId: string) => {
  await requireRole(userId, documentId, documentRole.OWNER)
  await prisma.document.delete({ where: { id: documentId } })
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.DOCUMENT_DELETED
  }
}
