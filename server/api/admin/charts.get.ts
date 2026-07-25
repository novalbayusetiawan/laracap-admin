import { and, eq, gte, sql } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, deviceLogs } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * GET /api/admin/charts — dashboard time-series (last 14 days, UTC daily buckets).
 *  - checkins: device_logs count per day (type=check)
 *  - downloads: device_logs count per day (type=download)
 *  - platforms: device_logs count per platform-ish column via devices join is skipped;
 *    platform split comes from user_agent-free device rows — kept simple: bundle uploads per day.
 * Non-admins are scoped via application ownership.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = useDatabase(event)

  const since = new Date(Date.now() - 13 * 86_400_000)
  const sinceIso = since.toISOString().slice(0, 10) // YYYY-MM-DD

  const day = sql<string>`substr(${deviceLogs.createdAt}, 1, 10)`
  const ownership = user.isAdmin ? undefined : eq(applications.userId, user.id)

  const logRows = await db
    .select({ day, type: deviceLogs.type, n: sql<number>`count(*)` })
    .from(deviceLogs)
    .leftJoin(applications, eq(deviceLogs.applicationId, applications.id))
    .where(and(gte(deviceLogs.createdAt, sinceIso), ownership))
    .groupBy(day, deviceLogs.type)

  const uploadDay = sql<string>`substr(${bundles.createdAt}, 1, 10)`
  const uploadRows = await db
    .select({ day: uploadDay, n: sql<number>`count(*)` })
    .from(bundles)
    .innerJoin(applications, eq(bundles.applicationId, applications.id))
    .where(and(gte(bundles.createdAt, sinceIso), ownership))
    .groupBy(uploadDay)

  // Dense series: every one of the 14 days present, zero-filled.
  const days: string[] = Array.from({ length: 14 }, (_, i) =>
    new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10))

  const checks = new Map<string, number>()
  const downloads = new Map<string, number>()
  for (const r of logRows) {
    ;(r.type === 'download' ? downloads : checks).set(r.day, r.n)
  }
  const uploads = new Map(uploadRows.map((r) => [r.day, r.n]))

  return {
    days,
    checkins: days.map((d) => checks.get(d) ?? 0),
    downloads: days.map((d) => downloads.get(d) ?? 0),
    uploads: days.map((d) => uploads.get(d) ?? 0),
  }
})
