import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { personalAccessTokens } from '~~/server/database/schema'
import { requireBearerAuth } from '~~/server/utils/bearer-auth'

/**
 * DELETE /api/logout — revoke the current token only (docs/03-api-contract.md). Returns 204.
 */
export default defineEventHandler(async (event) => {
  const { token } = await requireBearerAuth(event)
  const db = useDatabase(event)
  await db.delete(personalAccessTokens).where(eq(personalAccessTokens.id, token.id))
  setResponseStatus(event, 204)
  return null
})
