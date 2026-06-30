import { streamText } from 'ai'
import { parseJsonBody } from '@/lib/http/respond'
import { genericErrorHandler } from '@/lib/errors'
import { requireSessionUser } from '@/lib/auth/session'
import { documentRole, httpStatusConstant, messageConstant } from '@/lib/constants'
import { getVersion } from '@/lib/services/version.service'
import { isAiEnabled, aiModel } from '@/lib/ai/server'
import { checkAiRate } from '@/lib/ai/rate-limit'
import { DIFF_SYSTEM } from '@/lib/ai/prompts'
import { extractText } from '@/lib/ai/text'
import { diffExplainSchema } from '@/lib/validators/ai'

// POST /api/ai/diff — stream a plain-language explanation of what changed between a
// saved version (BEFORE) and the current document (AFTER). getVersion enforces access.
export async function POST(req: Request) {
  try {
    const user = await requireSessionUser()

    if (!isAiEnabled()) {
      return Response.json(
        { code: httpStatusConstant.SERVICE_UNAVAILABLE, message: messageConstant.AI_DISABLED },
        { status: httpStatusConstant.SERVICE_UNAVAILABLE }
      )
    }

    const { documentId, versionId, currentText } = diffExplainSchema.parse(
      await parseJsonBody(req, 300_000)
    )

    if (!checkAiRate(user.id)) {
      return Response.json(
        { code: httpStatusConstant.TOO_MANY_REQUESTS, message: messageConstant.AI_RATE_LIMITED },
        { status: httpStatusConstant.TOO_MANY_REQUESTS }
      )
    }

    // Access is enforced here (Viewer+ on this document).
    const version = await getVersion(user.id, documentId, versionId)
    const data = version.data as { label: string; content: unknown }
    const before = extractText(data.content)

    const prompt = [
      `BEFORE (saved version "${data.label}"):`,
      before || '(empty)',
      '',
      'AFTER (current document):',
      currentText || '(empty)'
    ].join('\n')

    const result = streamText({
      model: aiModel('pro'),
      system: DIFF_SYSTEM,
      prompt,
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
