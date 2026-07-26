import { count, desc, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, channels } from '~~/server/database/schema'
import { serializeApplication } from '~~/server/utils/serializers/application'
import { toLaravelTimestamp } from '~~/server/utils/serialization'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * GET /api/admin/applications/:id — detail view: app + channels (with bundle
 * counts) + recent bundles. Scoped: admin sees all, others own apps only.
 */
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

  const appChannels = await db
    .select()
    .from(channels)
    .where(eq(channels.applicationId, app.id))
    .orderBy(desc(channels.createdAt))

  const bundleCounts = await db
    .select({ channelId: bundles.channelId, n: count() })
    .from(bundles)
    .where(eq(bundles.applicationId, app.id))
    .groupBy(bundles.channelId)
  const bc = new Map(bundleCounts.map((r) => [r.channelId, r.n]))

  const recentBundles = await db
    .select({
      id: bundles.id,
      name: bundles.name,
      size: bundles.size,
      channelId: bundles.channelId,
      createdAt: bundles.createdAt,
    })
    .from(bundles)
    .where(eq(bundles.applicationId, app.id))
    .orderBy(desc(bundles.createdAt), desc(bundles.id))
    .limit(10)

  const channelNames = new Map(appChannels.map((c) => [c.id, c.name]))

  return {
    ...serializeApplication(app),
    channels: appChannels.map((c) => ({
      id: c.id,
      name: c.name,
      bundles_count: bc.get(c.id) ?? 0,
      created_at: toLaravelTimestamp(c.createdAt),
    })),
    recent_bundles: recentBundles.map((b) => ({
      id: b.id,
      name: b.name,
      size: b.size,
      channel_name: b.channelId != null ? (channelNames.get(b.channelId) ?? null) : null,
      created_at: toLaravelTimestamp(b.createdAt),
    })),
  }
})
