import { count, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { getSetting } from '~~/server/services/settings'
import { hashBcryptPassword } from '~~/server/utils/password'

/**
 * POST /api/admin/register — self-registration.
 * The FIRST user ever becomes superadmin+admin automatically (bootstrap).
 * After that, registration can be disabled via the registration_enabled setting.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  const db = useDatabase(event)
  const [{ value: userCount }] = await db.select({ value: count() }).from(users)
  const isFirstUser = userCount === 0

  if (!isFirstUser && !(await getSetting(db, 'registration_enabled'))) {
    throw createError({ statusCode: 403, statusMessage: 'Registration is disabled.' })
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    throw createError({ statusCode: 422, statusMessage: 'The email has already been taken.' })
  }

  const nowIso = new Date().toISOString()
  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      password: await hashBcryptPassword(password),
      isAdmin: isFirstUser,
      isSuperadmin: isFirstUser,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .returning()

  await setUserSession(event, {
    user: { id: user!.id, name: user!.name, email: user!.email, isAdmin: user!.isAdmin, isSuperadmin: user!.isSuperadmin },
  })
  return { ok: true }
})
