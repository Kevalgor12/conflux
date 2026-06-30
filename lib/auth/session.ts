import { auth } from './index'
import { UnauthorizedError } from '@/lib/errors'
import { messageConstant } from '@/lib/constants'

// The authenticated user for the current request (or null).
export const getSessionUser = async () => {
  const session = await auth()
  return session?.user?.id ? session.user : null
}

// Same, but throws a 401 when there is no session (use in API handlers).
export const requireSessionUser = async () => {
  const user = await getSessionUser()
  if (!user?.id) throw new UnauthorizedError(messageConstant.UNAUTHENTICATED)
  return user
}
