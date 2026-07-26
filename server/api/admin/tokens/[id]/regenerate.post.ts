import { and, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { personalAccessTokens, users } from '~~/server/database/schema'
import { createToken } from '~~/server/services/tokens'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * POST /api/admin/tokens/:id/regenerate — rotate a token's secret.
 * Tokens are stored hashed (Sanctum-compatible), so the plain value cannot be
 * re-shown after creation. Rotation issues a NEW token (same name/expiry),
 * deletes the old row, and returns the new plain value exactly once.
 * The old token stops working immediately.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const db = useDatabase(event)
  const [existing] = await db
    .select()
    .from(personalAccessTokens)
    .where(and(eq(personalAccessTokens.id, id), eq(personalAccessTokens.tokenableId, sessionUser.id)))
    .limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated.' })
  }

  // Expired tokens keep their expiry (still expired after rotation) — rotate is
  // for "I lost the value", not for extending life. Preserve name + expiry.
  const abilities: string[] = existing.abilities ? JSON.parse(existing.abilities) : ['*']
  const { id: newId, plainTextToken } = await createToken(db, user, existing.name, abilities, existing.expiresAt)
  await db.delete(personalAccessTokens).where(eq(personalAccessTokens.id, id))

  return { id: newId, token: plainTextToken }
})
