import { useDatabase } from '~~/server/database/client'
import { getAllSettings } from '~~/server/services/settings'
import { requireSuperadmin } from '~~/server/utils/superadmin-auth'

/** GET /api/admin/settings — superadmin only. */
export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  return getAllSettings(useDatabase(event))
})
