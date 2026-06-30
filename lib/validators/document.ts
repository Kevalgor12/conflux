import { z } from 'zod'

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long').optional()
})

export const renameDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long')
})

// Owners invite by email; new members are Editors or Viewers (not another Owner).
export const addMemberSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['EDITOR', 'VIEWER'])
})

// Role changes can only set Editor/Viewer — a member can never be promoted to a
// second Owner (the document has a single canonical owner; transferring ownership
// would be a separate, explicit operation).
export const updateMemberSchema = z.object({
  role: z.enum(['EDITOR', 'VIEWER'])
})

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type RenameDocumentInput = z.infer<typeof renameDocumentSchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>
