import { count, desc } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, users } from '~~/server/database/schema'
import { requireAdminUser } from '~~/server/utils/admin-auth'
import { serializeUser } from '~~/server/utils/serializers/user'

/** GET /api/admin/users — admin-only list with application counts (docs/06 §UserResource). */
export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const db = useDatabase(event)

  const rows = await db.select().from(users).orderBy(desc(users.createdAt))
  const counts = await db
    .select({ userId: applications.userId, n: count() })
    .from(applications)
    .groupBy(applications.userId)
  const byUser = new Map(counts.map((c) => [c.userId, c.n]))

  return rows.map((u) => ({
    ...serializeUser(u),
    is_superadmin: u.isSuperadmin,
    applications_count: byUser.get(u.id) ?? 0,
  }))
})
