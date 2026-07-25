import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { createToken } from '~~/server/services/tokens'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * POST /api/admin/tokens — create an API token (docs/06 §ApiTokenResource).
 * Returns the plain `{id}|{token}` exactly ONCE; only the hash is stored.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireSessionUser(event)
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const expiresAtRaw = typeof body?.expires_at === 'string' && body.expires_at !== '' ? body.expires_at : null
  if (!name || name.length > 255) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  let expiresAt: string | null = null
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw)
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now() + 60_000) {
      throw createError({ statusCode: 422, statusMessage: 'The expiry must be at least one minute from now.' })
    }
    expiresAt = d.toISOString()
  }

  const db = useDatabase(event)
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated.' })
  }

  const { id, plainTextToken } = await createToken(db, user, name, ['*'], expiresAt)
  setResponseStatus(event, 201)
  return { id, token: plainTextToken }
})
