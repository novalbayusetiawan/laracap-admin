import { count, desc, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, channels } from '~~/server/database/schema'
import { toLaravelTimestamp } from '~~/server/utils/serialization'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * GET /api/admin/channels — admin UI list (docs/06 §ChannelResource).
 * Admin: all; non-admin: via application.user_id.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = useDatabase(event)

  const rows = await db
    .select({ channel: channels, appName: applications.name })
    .from(channels)
    .innerJoin(applications, eq(channels.applicationId, applications.id))
    .where(user.isAdmin ? undefined : eq(applications.userId, user.id))
    .orderBy(desc(channels.createdAt))

  const bundleCounts = await db
    .select({ channelId: bundles.channelId, n: count() })
    .from(bundles)
    .groupBy(bundles.channelId)
  const bc = new Map(bundleCounts.map((r) => [r.channelId, r.n]))

  return rows.map(({ channel, appName }) => ({
    id: channel.id,
    name: channel.name,
    application_id: channel.applicationId,
    application_name: appName,
    bundles_count: bc.get(channel.id) ?? 0,
    created_at: toLaravelTimestamp(channel.createdAt),
  }))
})
