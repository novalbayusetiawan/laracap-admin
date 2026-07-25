import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** DELETE /api/admin/impersonate — return to the original superadmin session. */
export default defineEventHandler(async (event) => {
  const current = await requireSessionUser(event)
  if (!current.impersonatorId) {
    throw createError({ statusCode: 422, statusMessage: 'Not impersonating.' })
  }

  const db = useDatabase(event)
  const [admin] = await db.select().from(users).where(eq(users.id, current.impersonatorId)).limit(1)
  if (!admin) {
    await clearUserSession(event)
    return { ok: true }
  }

  await setUserSession(event, {
    user: { id: admin.id, name: admin.name, email: admin.email, isAdmin: admin.isAdmin, isSuperadmin: admin.isSuperadmin },
  })
  return { ok: true }
})
