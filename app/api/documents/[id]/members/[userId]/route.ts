import { withResponse, parseJsonBody } from '@/lib/http/respond'
import { requireSessionUser } from '@/lib/auth/session'
import { updateMember, removeMember } from '@/lib/services/membership.service'
import { updateMemberSchema } from '@/lib/validators/document'

// PATCH /api/documents/:id/members/:userId — change role (Owner only)
export const PATCH = withResponse<{ id: string; userId: string }>(async (req, ctx) => {
  const user = await requireSessionUser()
  const { id, userId } = await ctx.params
  const input = updateMemberSchema.parse(await parseJsonBody(req, 4096))
  return updateMember(user.id, id, userId, input)
})

// DELETE /api/documents/:id/members/:userId — revoke (Owner only)
export const DELETE = withResponse<{ id: string; userId: string }>(async (_req, ctx) => {
  const user = await requireSessionUser()
  const { id, userId } = await ctx.params
  return removeMember(user.id, id, userId)
})
