import type { H3Event } from 'h3'
import { requireSessionUser, type SessionUser } from './session-auth'

/** Require an admin session (docs/06: Users resource is admin-only). */
export async function requireAdminUser(event: H3Event): Promise<SessionUser> {
  const user = await requireSessionUser(event)
  if (!user.isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}
