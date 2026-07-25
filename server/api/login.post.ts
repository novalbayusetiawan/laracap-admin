import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { createToken } from '~~/server/services/tokens'
import { verifyBcryptPassword } from '~~/server/utils/password'

/**
 * POST /api/login — issue an API token for laracap-cli (docs/03-api-contract.md).
 * Frozen: returns `{ token }` (NOT access_token); 401 with exact message on bad creds.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown, password?: unknown }>(event).catch(() => null)
  const email = typeof body?.email === 'string' ? body.email : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!EMAIL_RE.test(email) || password.length === 0) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  const db = useDatabase(event)
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (!user || !(await verifyBcryptPassword(password, user.password))) {
    throw createError({ statusCode: 401, statusMessage: 'The provided credentials are incorrect.' })
  }

  const { plainTextToken } = await createToken(db, user, 'api-token')
  return { token: plainTextToken }
})
