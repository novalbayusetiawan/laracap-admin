import { desc, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, channels } from '~~/server/database/schema'
import { serializeBundle } from '~~/server/utils/serializers/bundle'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * GET /api/admin/bundles — admin UI list (docs/06 §BundleResource).
 * Admin: all; non-admin: via application.user_id. Order created_at desc.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = useDatabase(event)

  const rows = await db
    .select({ bundle: bundles, appName: applications.name, channelName: channels.name })
    .from(bundles)
    .innerJoin(applications, eq(bundles.applicationId, applications.id))
    .leftJoin(channels, eq(bundles.channelId, channels.id))
    .where(user.isAdmin ? undefined : eq(applications.userId, user.id))
    .orderBy(desc(bundles.createdAt), desc(bundles.id))

  return rows.map(({ bundle, appName, channelName }) => ({
    ...serializeBundle(bundle),
    application_name: appName,
    channel_name: channelName,
  }))
})
