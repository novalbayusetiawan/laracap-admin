import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { personalAccessTokens } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** DELETE /api/admin/tokens/:id — revoke (docs/06: "Revoke Token"). */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const db = useDatabase(event)
  const [token] = await db
    .select({ id: personalAccessTokens.id, tokenableId: personalAccessTokens.tokenableId })
    .from(personalAccessTokens)
    .where(eq(personalAccessTokens.id, id))
    .limit(1)

  if (!token || (!user.isAdmin && token.tokenableId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  await db.delete(personalAccessTokens).where(eq(personalAccessTokens.id, id))
  setResponseStatus(event, 204)
  return null
})
