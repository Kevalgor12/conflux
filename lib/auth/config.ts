import type { NextAuthConfig } from 'next-auth'

// Edge-safe base config. No adapter, no bcrypt, no Prisma — so it can run in
// middleware (the Edge runtime). The full Node config (lib/auth/index.ts) spreads
// this and adds the Prisma adapter + the Credentials provider.
export const authBaseConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/sign-in' },
  providers: [],
  callbacks: {
    // Route protection for matched paths (see middleware.ts).
    authorized: ({ auth }) => Boolean(auth?.user),
    // Persist the user id on the token at sign-in.
    jwt: ({ token, user }) => {
      if (user) token.id = user.id
      return token
    },
    // Expose the user id on the session.
    session: ({ session, token }) => {
      if (session.user) session.user.id = (token.id as string) || token.sub || ''
      return session
    }
  }
}
