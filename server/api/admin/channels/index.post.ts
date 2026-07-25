import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, channels } from '~~/server/database/schema'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** POST /api/admin/channels — create (docs/06 §ChannelResource form). */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const applicationId = Number(body?.application_id)
  if (!name || name.length > 255 || !Number.isInteger(applicationId)) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  const db = useDatabase(event)
  // Dropdown quirk parity: app select is scoped to auth user even for admins.
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1)
  if (!app || app.userId !== user.id) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  const nowIso = new Date().toISOString()
  const [created] = await db
    .insert(channels)
    .values({ uuid: crypto.randomUUID(), name, applicationId, createdAt: nowIso, updatedAt: nowIso })
    .returning()

  setResponseStatus(event, 201)
  return { id: created!.id, name: created!.name, application_id: created!.applicationId }
})
