import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, devices } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** DELETE /api/admin/devices/:id — row delete (logs cascade). */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const db = useDatabase(event)
  const [row] = await db
    .select({ ownerId: applications.userId })
    .from(devices)
    .leftJoin(bundles, eq(devices.bundleId, bundles.id))
    .leftJoin(applications, eq(bundles.applicationId, applications.id))
    .where(eq(devices.id, id))
    .limit(1)

  if (!row || (!user.isAdmin && row.ownerId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  await db.delete(devices).where(eq(devices.id, id))
  setResponseStatus(event, 204)
  return null
})
