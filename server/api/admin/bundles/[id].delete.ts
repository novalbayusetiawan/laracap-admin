import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** DELETE /api/admin/bundles/:id — removes the DB row and its R2 object. */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const db = useDatabase(event)
  const [row] = await db
    .select({ bundle: bundles, ownerId: applications.userId })
    .from(bundles)
    .innerJoin(applications, eq(bundles.applicationId, applications.id))
    .where(eq(bundles.id, id))
    .limit(1)

  if (!row || (!user.isAdmin && row.ownerId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  await db.delete(bundles).where(eq(bundles.id, id))

  const r2 = event.context.cloudflare?.env?.BUNDLES as R2Bucket | undefined
  if (r2) await r2.delete(row.bundle.filePath).catch(() => {})

  setResponseStatus(event, 204)
  return null
})
