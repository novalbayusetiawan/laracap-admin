import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications } from '~~/server/database/schema'
import { serializeApplication } from '~~/server/utils/serializers/application'
import { requireSessionUser } from '~~/server/utils/session-auth'

/** POST /api/admin/applications — modal create (docs/06 §ApplicationResource). */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  const description = typeof body?.description === 'string' && body.description !== '' ? body.description : null
  const rawLimit = body?.bundle_limit
  const bundleLimit = rawLimit == null || rawLimit === '' ? null : Number(rawLimit)

  if (!name || name.length > 255 || !slug || slug.length > 255) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }
  if (bundleLimit !== null && (!Number.isInteger(bundleLimit) || bundleLimit < 1)) {
    throw createError({ statusCode: 422, statusMessage: 'The bundle limit must be at least 1.' })
  }

  const db = useDatabase(event)
  const [dupe] = await db.select({ id: applications.id }).from(applications).where(eq(applications.slug, slug)).limit(1)
  if (dupe) {
    throw createError({ statusCode: 422, statusMessage: 'The slug has already been taken.' })
  }

  const nowIso = new Date().toISOString()
  const [created] = await db
    .insert(applications)
    .values({
      uuid: crypto.randomUUID(),
      name,
      slug,
      description,
      bundleLimit,
      userId: user.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .returning()

  setResponseStatus(event, 201)
  return serializeApplication(created!)
})
