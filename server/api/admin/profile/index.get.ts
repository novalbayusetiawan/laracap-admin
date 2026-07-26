import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { users } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** GET /api/admin/profile — current user's editable profile. */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireSessionUser(event)
  const db = useDatabase(event)

  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated.' })
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    company: user.company,
    is_admin: user.isAdmin,
    is_superadmin: user.isSuperadmin,
  }
})
