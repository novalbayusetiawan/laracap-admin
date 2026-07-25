import { requireBearerUser } from '~~/server/utils/bearer-auth'
import { serializeUser } from '~~/server/utils/serializers/user'

/** GET /api/user — current authenticated user (docs/03-api-contract.md). */
export default defineEventHandler(async (event) => {
  const user = await requireBearerUser(event)
  return serializeUser(user)
})
