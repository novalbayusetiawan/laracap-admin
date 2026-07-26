import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, channels } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** PATCH /api/admin/channels/:id — rename. */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 255) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  const db = useDatabase(event)
  const [row] = await db
    .select({ channel: channels, ownerId: applications.userId })
    .from(channels)
    .innerJoin(applications, eq(channels.applicationId, applications.id))
    .where(eq(channels.id, id))
    .limit(1)
  if (!row || (!user.isAdmin && row.ownerId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const [updated] = await db
    .update(channels)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(channels.id, id))
    .returning()

  return { id: updated!.id, name: updated!.name, application_id: updated!.applicationId }
})
