import type { Role } from '@prisma/client'
import { prisma } from '../db'
import { roleRank, messageConstant } from '../constants'
import { AccessForbiddenError } from '../errors'

// NOTE: relative imports on purpose — this module is used by both the Next route
// handlers AND the realtime layer (run by tsx via the custom server), so it must
// not rely on the `@/` path alias.

// The user's role on a document, or null if they have no access.
export const resolveRole = async (userId: string, documentId: string): Promise<Role | null> => {
  const membership = await prisma.documentMembership.findUnique({
    where: { documentId_userId: { documentId, userId } },
    select: { role: true }
  })
  return membership?.role ?? null
}

// Assert the user has at least `min` role on the document; returns the actual role.
export const requireRole = async (userId: string, documentId: string, min: Role): Promise<Role> => {
  const role = await resolveRole(userId, documentId)
  if (!role) throw new AccessForbiddenError(messageConstant.NO_ACCESS)
  if (roleRank[role] < roleRank[min]) {
    throw new AccessForbiddenError(messageConstant.INSUFFICIENT_ROLE)
  }
  return role
}
