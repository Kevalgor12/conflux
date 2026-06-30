import { withResponse, parseJsonBody } from '@/lib/http/respond'
import { requireSessionUser } from '@/lib/auth/session'
import { listVersions, createVersion } from '@/lib/services/version.service'
import { createVersionSchema } from '@/lib/validators/version'

// GET /api/documents/:id/versions — the version timeline (Viewer+)
export const GET = withResponse<{ id: string }>(async (_req, ctx) => {
  const user = await requireSessionUser()
  const { id } = await ctx.params
  return listVersions(user.id, id)
})

// POST /api/documents/:id/versions — save a snapshot (Editor+)
export const POST = withResponse<{ id: string }>(async (req, ctx) => {
  const user = await requireSessionUser()
  const { id } = await ctx.params
  // Versions carry the document content, so allow a larger (but still bounded) body.
  const input = createVersionSchema.parse(await parseJsonBody(req, 2_600_000))
  return createVersion(user.id, id, input)
})
