import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { requireAdminUser } from '~~/server/utils/admin-auth'
import { hashBcryptPassword } from '~~/server/utils/password'
import { serializeUser } from '~~/server/utils/serializers/user'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** POST /api/admin/users — admin-only create (docs/06 §UserResource form). */
export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const isAdmin = body?.is_admin === true

  if (!name || name.length > 255 || !EMAIL_RE.test(email) || password.length < 8) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  const db = useDatabase(event)
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    throw createError({ statusCode: 422, statusMessage: 'The email has already been taken.' })
  }

  const nowIso = new Date().toISOString()
  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      password: await hashBcryptPassword(password),
      isAdmin,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .returning()

  setResponseStatus(event, 201)
  return serializeUser(created!)
})
