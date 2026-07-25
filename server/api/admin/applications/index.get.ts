import { count, desc, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, channels } from '~~/server/database/schema'
import { serializeApplication } from '~~/server/utils/serializers/application'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * GET /api/admin/applications — admin UI list with bundle/channel counts.
 * Scoping (docs/06): admin sees all; non-admin `user_id = auth.id`.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = useDatabase(event)

  const where = user.isAdmin ? undefined : eq(applications.userId, user.id)
  const rows = await db.select().from(applications).where(where).orderBy(desc(applications.createdAt))

  // Counts per app (two grouped queries beat N+1).
  const bundleCounts = await db
    .select({ applicationId: bundles.applicationId, n: count() })
    .from(bundles)
    .groupBy(bundles.applicationId)
  const channelCounts = await db
    .select({ applicationId: channels.applicationId, n: count() })
    .from(channels)
    .groupBy(channels.applicationId)

  const bc = new Map(bundleCounts.map((r) => [r.applicationId, r.n]))
  const cc = new Map(channelCounts.map((r) => [r.applicationId, r.n]))

  return rows.map((app) => ({
    ...serializeApplication(app),
    bundles_count: bc.get(app.id) ?? 0,
    channels_count: cc.get(app.id) ?? 0,
  }))
})
