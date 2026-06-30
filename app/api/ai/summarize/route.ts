import { streamText } from 'ai'
import { parseJsonBody } from '@/lib/http/respond'
import { genericErrorHandler } from '@/lib/errors'
import { requireSessionUser } from '@/lib/auth/session'
import { requireRole } from '@/lib/auth/guards'
import { documentRole, httpStatusConstant, messageConstant } from '@/lib/constants'
import { isAiEnabled, aiModel } from '@/lib/ai/server'
import { checkAiRate } from '@/lib/ai/rate-limit'
import { SUMMARIZE_SYSTEM } from '@/lib/ai/prompts'
import { summarizeSchema } from '@/lib/validators/ai'

// POST /api/ai/summarize — stream a faithful summary of the supplied document text.
// Server-proxied (key stays server-side), authenticated, access-checked, rate-limited.
export async function POST(req: Request) {
  try {
    const user = await requireSessionUser()

    if (!isAiEnabled()) {
      return Response.json(
        { code: httpStatusConstant.SERVICE_UNAVAILABLE, message: messageConstant.AI_DISABLED },
        { status: httpStatusConstant.SERVICE_UNAVAILABLE }
      )
    }

    const { documentId, text } = summarizeSchema.parse(await parseJsonBody(req, 300_000))
    await requireRole(user.id, documentId, documentRole.VIEWER)

    if (!checkAiRate(user.id)) {
      return Response.json(
        { code: httpStatusConstant.TOO_MANY_REQUESTS, message: messageConstant.AI_RATE_LIMITED },
        { status: httpStatusConstant.TOO_MANY_REQUESTS }
      )
    }

    const result = streamText({
      model: aiModel('pro'),
      system: SUMMARIZE_SYSTEM,
      prompt: text,
      maxOutputTokens: 1024
    })
    return result.toTextStreamResponse()
  } catch (error) {
    const details = genericErrorHandler(error)
    return Response.json(
      { code: details.statusCode, message: details.message, error: details.error },
      { status: details.statusCode }
    )
  }
}
