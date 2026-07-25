import { count, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles } from '~~/server/database/schema'
import { createBundle } from '~~/server/services/bundle-upload'
import { requireBearerUser } from '~~/server/utils/bearer-auth'
import { serializeBundle } from '~~/server/utils/serializers/bundle'
import { isUuid } from '~~/server/utils/validation'

/**
 * POST /api/bundles — CLI upload (docs/03-api-contract.md, ADR 002). Bearer auth.
 *
 * Compat + fixes:
 *  - application_id accepts numeric id OR uuid (Str::isUuid parity)
 *  - null-safe bundle_limit gate (legacy bug: null blocked uploads)
 *  - exact 403 message strings
 */

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB (Filament parity)

export default defineEventHandler(async (event) => {
  const user = await requireBearerUser(event)
  const db = useDatabase(event)

  const form = await readFormData(event).catch(() => null)
  const file = form?.get('file')
  const rawAppId = form?.get('application_id')
  if (!form || !(file instanceof File) || typeof rawAppId !== 'string' || rawAppId === '') {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 422, statusMessage: 'The file may not be greater than 10 MB.' })
  }

  const [application] = await db
    .select()
    .from(applications)
    .where(isUuid(rawAppId) ? eq(applications.uuid, rawAppId) : eq(applications.id, Number(rawAppId)))
    .limit(1)

  if (!application || application.userId !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'You are not authorized to upload bundles for this application',
    })
  }

  // Null-safe retention gate (legacy bug fix): only enforce when a limit is set.
  if (application.bundleLimit != null) {
    const [{ value: current }] = await db
      .select({ value: count() })
      .from(bundles)
      .where(eq(bundles.applicationId, application.id))
    if (current >= application.bundleLimit) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You have reached the maximum number of bundles for this application',
      })
    }
  }

  const r2 = event.context.cloudflare?.env?.BUNDLES as R2Bucket | undefined
  if (!r2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 binding "BUNDLES" not available' })
  }

  const created = await createBundle(db, r2, application, { form, file })
  return serializeBundle(created)
})
