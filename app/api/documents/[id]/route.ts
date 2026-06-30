import { withResponse, parseJsonBody } from '@/lib/http/respond'
import { requireSessionUser } from '@/lib/auth/session'
import { getDocument, renameDocument, deleteDocument } from '@/lib/services/document.service'
import { renameDocumentSchema } from '@/lib/validators/document'

// GET /api/documents/:id — metadata + caller's role (Viewer+)
export const GET = withResponse<{ id: string }>(async (_req, ctx) => {
  const user = await requireSessionUser()
  const { id } = await ctx.params
  return getDocument(user.id, id)
})

// PATCH /api/documents/:id — rename (Editor+)
export const PATCH = withResponse<{ id: string }>(async (req, ctx) => {
  const user = await requireSessionUser()
  const { id } = await ctx.params
  const input = renameDocumentSchema.parse(await parseJsonBody(req, 4096))
  return renameDocument(user.id, id, input)
})

// DELETE /api/documents/:id — delete (Owner only)
export const DELETE = withResponse<{ id: string }>(async (_req, ctx) => {
  const user = await requireSessionUser()
  const { id } = await ctx.params
  return deleteDocument(user.id, id)
})
