import { count, countDistinct, eq, sum } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, channels, devices, users } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * GET /api/admin/stats — dashboard StatsOverview (docs/06 §Dashboard Widgets).
 * Scoping: admin sees all except Bundle Sizes (always own); non-admin scoped via ownership.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = useDatabase(event)
  const scoped = !user.isAdmin

  const appWhere = scoped ? eq(applications.userId, user.id) : undefined

  const [apps] = await db.select({ n: count() }).from(applications).where(appWhere)

  const [chans] = await db
    .select({ n: count() })
    .from(channels)
    .innerJoin(applications, eq(channels.applicationId, applications.id))
    .where(appWhere)

  const [devs] = await db
    .select({ n: countDistinct(devices.id) })
    .from(devices)
    .innerJoin(bundles, eq(devices.bundleId, bundles.id))
    .innerJoin(applications, eq(bundles.applicationId, applications.id))
    .where(appWhere)

  // Bundle Sizes: ALWAYS scoped to own user, even for admins (legacy quirk).
  const [sizes] = await db
    .select({ total: sum(bundles.size) })
    .from(bundles)
    .innerJoin(applications, eq(bundles.applicationId, applications.id))
    .where(eq(applications.userId, user.id))

  const totalUsers = user.isAdmin
    ? (await db.select({ n: count() }).from(users))[0]!.n
    : null

  return {
    applications: apps!.n,
    channels: chans!.n,
    active_devices: devs!.n,
    bundle_bytes: Number(sizes!.total ?? 0),
    total_users: totalUsers,
  }
})
