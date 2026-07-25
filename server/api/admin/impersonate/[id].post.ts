import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { requireSuperadmin } from '~~/server/utils/superadmin-auth'

/**
 * POST /api/admin/impersonate/:id — superadmin assumes another user's session.
 * The original superadmin id is kept in the session for the banner + stop action.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireSuperadmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id === admin.id) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid impersonation target.' })
  }

  const db = useDatabase(event)
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  await setUserSession(event, {
    user: {
      id: target.id,
      name: target.name,
      email: target.email,
      isAdmin: target.isAdmin,
      isSuperadmin: target.isSuperadmin,
      impersonatorId: admin.impersonatorId ?? admin.id,
    },
  })
  return { ok: true }
})
