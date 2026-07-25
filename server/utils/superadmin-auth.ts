import type { H3Event } from 'h3'
import { requireSessionUser, type SessionUser } from './session-auth'

/** Require a superadmin session (settings, impersonation). */
export async function requireSuperadmin(event: H3Event): Promise<SessionUser> {
  const user = await requireSessionUser(event)
  if (!user.isSuperadmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}
