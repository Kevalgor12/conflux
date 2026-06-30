import { prisma } from '@/lib/db'
import { httpStatusConstant, messageConstant, documentRole } from '@/lib/constants'
import { requireRole } from '@/lib/auth/guards'
import { NotFoundError, RequestConflictError, BadRequestError } from '@/lib/errors'
import { membersListDTO, memberDTO } from '@/lib/dtos/document'
import type { AddMemberInput, UpdateMemberInput } from '@/lib/validators/document'

// List collaborators (Viewer+ can see who's on the document).
export const listMembers = async (userId: string, documentId: string) => {
  await requireRole(userId, documentId, documentRole.VIEWER)
  const memberships = await prisma.documentMembership.findMany({
    where: { documentId },
    include: { user: true },
    orderBy: { createdAt: 'asc' }
  })
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.MEMBERS_RETRIEVED,
    data: membersListDTO(memberships)
  }
}

// Invite an existing user by email as Editor/Viewer (Owner only).
export const addMember = async (userId: string, documentId: string, input: AddMemberInput) => {
  await requireRole(userId, documentId, documentRole.OWNER)

  const invitee = await prisma.user.findUnique({ where: { email: input.email } })
  if (!invitee) throw new NotFoundError(messageConstant.USER_NOT_FOUND)

  const existing = await prisma.documentMembership.findUnique({
    where: { documentId_userId: { documentId, userId: invitee.id } }
  })
  if (existing) throw new RequestConflictError(messageConstant.ALREADY_MEMBER)

  const membership = await prisma.documentMembership.create({
    data: { documentId, userId: invitee.id, role: input.role },
    include: { user: true }
  })
  return {
    statusCode: httpStatusConstant.CREATED,
    message: messageConstant.MEMBER_ADDED,
    data: memberDTO(membership)
  }
}

// Change a member's role (Owner only). The document owner cannot be modified here.
export const updateMember = async (
  userId: string,
  documentId: string,
  targetUserId: string,
  input: UpdateMemberInput
) => {
  await requireRole(userId, documentId, documentRole.OWNER)

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document) throw new NotFoundError(messageConstant.DOCUMENT_NOT_FOUND)
  if (document.ownerId === targetUserId) {
    throw new BadRequestError(messageConstant.CANNOT_MODIFY_OWNER)
  }

  const membership = await prisma.documentMembership.update({
    where: { documentId_userId: { documentId, userId: targetUserId } },
    data: { role: input.role },
    include: { user: true }
  })
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.MEMBER_UPDATED,
    data: memberDTO(membership)
  }
}

// Revoke a member (Owner only). The document owner cannot be removed.
export const removeMember = async (userId: string, documentId: string, targetUserId: string) => {
  await requireRole(userId, documentId, documentRole.OWNER)

  const document = await prisma.document.findUnique({ where: { id: documentId } })
  if (!document) throw new NotFoundError(messageConstant.DOCUMENT_NOT_FOUND)
  if (document.ownerId === targetUserId) {
    throw new BadRequestError(messageConstant.CANNOT_MODIFY_OWNER)
  }

  await prisma.documentMembership.delete({
    where: { documentId_userId: { documentId, userId: targetUserId } }
  })
  return {
    statusCode: httpStatusConstant.OK,
    message: messageConstant.MEMBER_REMOVED
  }
}
