import { withResponse, parseJsonBody } from '@/lib/http/respond'
import { requireSessionUser } from '@/lib/auth/session'
import { listDocuments, createDocument } from '@/lib/services/document.service'
import { createDocumentSchema } from '@/lib/validators/document'

// GET /api/documents — the caller's documents
export const GET = withResponse(async () => {
  const user = await requireSessionUser()
  return listDocuments(user.id)
})

// POST /api/documents — create a new document (caller becomes Owner)
export const POST = withResponse(async (req) => {
  const user = await requireSessionUser()
  const input = createDocumentSchema.parse(await parseJsonBody(req, 16384))
  return createDocument(user.id, input)
})
