import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * PATCH /api/admin/profile — update own name/email/bio/company, and optionally
 * password (requires current_password). Refreshes the session so the sidebar
 * reflects changes immediately.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireSessionUser(event)
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const bio = typeof body?.bio === 'string' && body.bio.trim() !== '' ? body.bio.trim() : null
  const company = typeof body?.company === 'string' && body.company.trim() !== '' ? body.company.trim() : null

  if (!name || name.length > 255 || !email || email.length > 255 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }
  if (bio && bio.length > 1000) {
    throw createError({ statusCode: 422, statusMessage: 'The bio may not be greater than 1000 characters.' })
  }

  const db = useDatabase(event)
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated.' })
  }

  // Email uniqueness (excluding self).
  const [emailOwner] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (emailOwner && emailOwner.id !== user.id) {
    throw createError({ statusCode: 422, statusMessage: 'The email has already been taken.' })
  }

  // Optional password change — requires the current password.
  let passwordHash: string | undefined
  const newPassword = typeof body?.password === 'string' ? body.password : ''
  if (newPassword) {
    const currentPassword = typeof body?.current_password === 'string' ? body.current_password : ''
    if (newPassword.length < 8) {
      throw createError({ statusCode: 422, statusMessage: 'The password must be at least 8 characters.' })
    }
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      throw createError({ statusCode: 422, statusMessage: 'The current password is incorrect.' })
    }
    passwordHash = await bcrypt.hash(newPassword, 10)
  }

  const [updated] = await db
    .update(users)
    .set({
      name,
      email,
      bio,
      company,
      ...(passwordHash ? { password: passwordHash } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, user.id))
    .returning()

  // Refresh session so name/email in the sidebar update immediately.
  const session = await getUserSession(event)
  await setUserSession(event, {
    user: {
      ...session.user!,
      name: updated!.name,
      email: updated!.email,
    },
  })

  return {
    id: updated!.id,
    name: updated!.name,
    email: updated!.email,
    bio: updated!.bio,
    company: updated!.company,
  }
})
