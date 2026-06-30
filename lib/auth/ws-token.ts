import { decode } from 'next-auth/jwt'

// Resolve the authenticated user id from the cookies sent on a WebSocket upgrade.
// The browser includes the Auth.js session cookie on same-origin WS handshakes, so
// the realtime layer can authenticate without putting tokens in the URL.
//
// Relative-only deps + next-auth/jwt — safe to run under tsx in the custom server.

// Auth.js v5 session-cookie names (dev + Secure prod variant). The cookie name is
// also the JWT `salt`, so we try each.
const COOKIE_NAMES = ['authjs.session-token', '__Secure-authjs.session-token']

const parseCookies = (header: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key) out[key] = decodeURIComponent(value)
  }
  return out
}

export const getUserIdFromCookieHeader = async (cookieHeader?: string): Promise<string | null> => {
  if (!cookieHeader) return null
  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  const cookies = parseCookies(cookieHeader)
  for (const name of COOKIE_NAMES) {
    const token = cookies[name]
    if (!token) continue
    try {
      const payload = await decode({ token, secret, salt: name })
      const id = (payload?.id as string | undefined) || payload?.sub
      if (id) return id
    } catch {
      // try the next cookie name
    }
  }
  return null
}
