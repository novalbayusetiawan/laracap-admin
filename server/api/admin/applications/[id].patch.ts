import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications } from '~~/server/database/schema'
import { serializeApplication } from '~~/server/utils/serializers/application'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** PATCH /api/admin/applications/:id — edit name/description/bundle_limit. */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' && body.description !== '' ? body.description : null
  const rawLimit = body?.bundle_limit
  const bundleLimit = rawLimit == null || rawLimit === '' ? null : Number(rawLimit)

  if (!name || name.length > 255) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }
  if (bundleLimit !== null && (!Number.isInteger(bundleLimit) || bundleLimit < 1)) {
    throw createError({ statusCode: 422, statusMessage: 'The bundle limit must be at least 1.' })
  }

  const db = useDatabase(event)
  const [app] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
  if (!app || (!user.isAdmin && app.userId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const [updated] = await db
    .update(applications)
    .set({ name, description, bundleLimit, updatedAt: new Date().toISOString() })
    .where(eq(applications.id, id))
    .returning()

  return serializeApplication(updated!)
})
