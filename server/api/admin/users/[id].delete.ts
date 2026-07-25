import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { requireAdminUser } from '~~/server/utils/admin-auth'

/** DELETE /api/admin/users/:id — admin-only; cannot delete yourself. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdminUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }
  if (id === admin.id) {
    throw createError({ statusCode: 422, statusMessage: 'You cannot delete your own account.' })
  }

  const db = useDatabase(event)
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  await db.delete(users).where(eq(users.id, id))
  setResponseStatus(event, 204)
  return null
})
