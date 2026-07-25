import type { H3Event } from 'h3'

export interface SessionUser {
  id: number
  name: string
  email: string
  isAdmin: boolean
  isSuperadmin?: boolean
  /** Set while a superadmin is impersonating another user. */
  impersonatorId?: number
}

/** Require a sealed-cookie session (admin UI) and return its user. */
export async function requireSessionUser(event: H3Event): Promise<SessionUser> {
  const session = await requireUserSession(event)
  return session.user as SessionUser
}
