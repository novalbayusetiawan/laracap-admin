import { eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications } from '~~/server/database/schema'
import { createBundle } from '~~/server/services/bundle-upload'
import { serializeBundle } from '~~/server/utils/serializers/bundle'
import { MAX_BUNDLE_UPLOAD_BYTES, MAX_BUNDLE_UPLOAD_MESSAGE } from '~~/server/utils/bundle-upload-limits'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * POST /api/admin/bundles — admin UI upload (docs/06 §BundleResource form).
 * Quirk parity: application dropdown is scoped to the auth user even for admins,
 * so ownership is enforced here for everyone.
 */

export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = useDatabase(event)

  const form = await readFormData(event).catch(() => null)
  const file = form?.get('file')
  const rawAppId = form?.get('application_id')
  const name = form?.get('name')
  if (!form || !(file instanceof File) || typeof rawAppId !== 'string' || rawAppId === '' || typeof name !== 'string' || !name) {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }
  if (file.size > MAX_BUNDLE_UPLOAD_BYTES) {
    throw createError({ statusCode: 422, statusMessage: MAX_BUNDLE_UPLOAD_MESSAGE })
  }

  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, Number(rawAppId)))
    .limit(1)
  if (!application || application.userId !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'You are not authorized to upload bundles for this application' })
  }

  const r2 = event.context.cloudflare?.env?.BUNDLES as R2Bucket | undefined
  if (!r2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 binding "BUNDLES" not available' })
  }

  const created = await createBundle(db, r2, application, { form, file })
  setResponseStatus(event, 201)
  return serializeBundle(created)
})
