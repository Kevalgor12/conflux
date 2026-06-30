import { withResponse } from '@/lib/http/respond'
import { requireSessionUser } from '@/lib/auth/session'
import { getVersion } from '@/lib/services/version.service'

// GET /api/documents/:id/versions/:versionId — one version's content (Viewer+),
// used for preview and as the restore target.
export const GET = withResponse<{ id: string; versionId: string }>(async (_req, ctx) => {
  const user = await requireSessionUser()
  const { id, versionId } = await ctx.params
  return getVersion(user.id, id, versionId)
})
