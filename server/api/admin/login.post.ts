import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { verifyBcryptPassword } from '~~/server/utils/password'

/** POST /api/admin/login — sealed-cookie session for the admin UI. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown, password?: unknown }>(event).catch(() => null)
  const email = typeof body?.email === 'string' ? body.email : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  const db = useDatabase(event)
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !(await verifyBcryptPassword(password, user.password))) {
    throw createError({ statusCode: 401, statusMessage: 'The provided credentials are incorrect.' })
  }

  await setUserSession(event, {
    user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, isSuperadmin: user.isSuperadmin },
  })
  return { ok: true }
})
