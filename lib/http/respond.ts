import { NextResponse } from 'next/server'
import { genericErrorHandler, PayloadTooLargeError, BadRequestError } from '@/lib/errors'
import { messageConstant } from '@/lib/constants'

// Read + parse a JSON body with a hard size cap (rejects oversized payloads before
// allocating/parsing — part of the OOM/abuse defense, docs/09).
export const parseJsonBody = async <T = unknown>(req: Request, maxBytes = 65536): Promise<T> => {
  const declared = Number(req.headers.get('content-length') || 0)
  if (declared > maxBytes) throw new PayloadTooLargeError(messageConstant.PAYLOAD_TOO_LARGE)
  const text = await req.text()
  if (text.length > maxBytes) throw new PayloadTooLargeError(messageConstant.PAYLOAD_TOO_LARGE)
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new BadRequestError(messageConstant.VALIDATION_FAILED)
  }
}

// The shape a route's inner handler returns (mirrors the service-layer return shape).
export interface HandlerResult {
  statusCode: number
  message?: string
  data?: unknown
  headers?: Record<string, string>
}

type RouteContext<P> = { params: Promise<P> }

// Wrap a route handler so success becomes { code, message, data } and any thrown
// error (BaseError, ZodError, or otherwise) becomes { code, message, error } — the
// single place response formatting lives (the analog of the backend responseHandler).
export const withResponse = <P extends Record<string, string> = Record<string, string>>(
  handler: (req: Request, ctx: RouteContext<P>) => Promise<HandlerResult>
) => {
  return async (req: Request, ctx: RouteContext<P>): Promise<NextResponse> => {
    try {
      const { statusCode, message, data, headers } = await handler(req, ctx)
      return NextResponse.json({ code: statusCode, message, data }, { status: statusCode, headers })
    } catch (error) {
      const details = genericErrorHandler(error)
      // Log the real error server-side; never leak internals to the client.
      console.error('[api] error', error)
      return NextResponse.json(
        { code: details.statusCode, message: details.message, error: details.error },
        { status: details.statusCode }
      )
    }
  }
}
