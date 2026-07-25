import { useDatabase } from '~~/server/database/client'
import { getAllSettings, setSetting } from '~~/server/services/settings'
import { requireSuperadmin } from '~~/server/utils/superadmin-auth'

/** PATCH /api/admin/settings — superadmin only. Body: partial settings object. */
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 422, statusMessage: 'The given data was invalid.' })
  }

  const db = useDatabase(event)
  if (typeof body.registration_enabled === 'boolean') {
    await setSetting(db, 'registration_enabled', body.registration_enabled)
  }
  return getAllSettings(db)
})
