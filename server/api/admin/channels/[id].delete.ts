import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, channels } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** DELETE /api/admin/channels/:id — bundles keep existing (FK set null). */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const db = useDatabase(event)
  const [row] = await db
    .select({ ownerId: applications.userId })
    .from(channels)
    .innerJoin(applications, eq(channels.applicationId, applications.id))
    .where(eq(channels.id, id))
    .limit(1)

  if (!row || (!user.isAdmin && row.ownerId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  await db.delete(channels).where(eq(channels.id, id))
  setResponseStatus(event, 204)
  return null
})
