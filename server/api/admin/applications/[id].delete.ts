import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** DELETE /api/admin/applications/:id — row/bulk delete (cascades via FK). */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const db = useDatabase(event)
  const [app] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
  if (!app || (!user.isAdmin && app.userId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  await db.delete(applications).where(eq(applications.id, id))
  setResponseStatus(event, 204)
  return null
})
