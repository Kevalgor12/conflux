import type { Document, DocumentMembership, Role, User } from '@prisma/client'

// Explicit response shaping (field-by-field with fallbacks) — never leak raw rows.

export const documentDTO = (doc: Document | null, role?: Role | null) => ({
  id: doc?.id || null,
  title: doc?.title || 'Untitled',
  role: role || null,
  ownerId: doc?.ownerId || null,
  createdAt: doc?.createdAt || null,
  updatedAt: doc?.updatedAt || null
})

type MembershipWithDoc = DocumentMembership & { document: Document }

export interface DocumentListItem {
  id: string | null
  title: string
  role: Role | null
  updatedAt: Date | null
}

export const documentsListDTO = (memberships: MembershipWithDoc[]): DocumentListItem[] => {
  if (!memberships?.length) return []
  return memberships.map((membership) => ({
    id: membership?.document?.id || null,
    title: membership?.document?.title || 'Untitled',
    role: membership?.role || null,
    updatedAt: membership?.document?.updatedAt || null
  }))
}

type MembershipWithUser = DocumentMembership & { user: User }

export const memberDTO = (membership: MembershipWithUser) => ({
  userId: membership?.user?.id || null,
  name: membership?.user?.name || null,
  email: membership?.user?.email || null,
  role: membership?.role || null
})

export const membersListDTO = (memberships: MembershipWithUser[]) => {
  if (!memberships?.length) return []
  return memberships.map(memberDTO)
}
