import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications } from '~~/server/database/schema'
import { requireBearerUser } from '~~/server/utils/bearer-auth'
import { serializeApplication } from '~~/server/utils/serializers/application'

/**
 * GET /api/applications — list the authenticated user's applications
 * (docs/03-api-contract.md). Tenancy: user_id = auth.id.
 */
export default defineEventHandler(async (event) => {
  const user = await requireBearerUser(event)
  const db = useDatabase(event)
  const rows = await db.select().from(applications).where(eq(applications.userId, user.id))
  return rows.map(serializeApplication)
})
