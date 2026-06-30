import { withResponse, parseJsonBody } from '@/lib/http/respond'
import { requireSessionUser } from '@/lib/auth/session'
import { listMembers, addMember } from '@/lib/services/membership.service'
import { addMemberSchema } from '@/lib/validators/document'

// GET /api/documents/:id/members — collaborators (Viewer+)
export const GET = withResponse<{ id: string }>(async (_req, ctx) => {
  const user = await requireSessionUser()
  const { id } = await ctx.params
  return listMembers(user.id, id)
})

// POST /api/documents/:id/members — invite by email (Owner only)
export const POST = withResponse<{ id: string }>(async (req, ctx) => {
  const user = await requireSessionUser()
  const { id } = await ctx.params
  const input = addMemberSchema.parse(await parseJsonBody(req, 4096))
  return addMember(user.id, id, input)
})
