import NextAuth from 'next-auth'
import { authBaseConfig } from '@/lib/auth/config'

// Next 16 "proxy" (formerly "middleware"). Edge-safe instance — only reads/verifies
// the JWT (no Prisma), so the `authorized` callback can gate the matched routes and
// redirect unauthenticated users to the sign-in page.
export const { auth } = NextAuth(authBaseConfig)

export default auth

export const config = {
  matcher: ['/documents', '/documents/:path*']
}
