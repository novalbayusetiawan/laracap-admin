import { desc, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { personalAccessTokens, users } from '~~/server/database/schema'
import { toLaravelTimestamp } from '~~/server/utils/serialization'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * GET /api/admin/tokens — API token list (docs/06 §ApiTokenResource).
 * Admin: all (with owner name); non-admin: own only. Hash never leaves the server;
 * plain token is shown exactly once at creation (legacy plaintext column not replicated).
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = useDatabase(event)

  const rows = await db
    .select({ token: personalAccessTokens, ownerName: users.name })
    .from(personalAccessTokens)
    .innerJoin(users, eq(personalAccessTokens.tokenableId, users.id))
    .where(user.isAdmin ? undefined : eq(personalAccessTokens.tokenableId, user.id))
    .orderBy(desc(personalAccessTokens.createdAt))

  const now = Date.now()
  return rows.map(({ token, ownerName }) => ({
    id: token.id,
    name: token.name,
    user_name: user.isAdmin ? ownerName : undefined,
    created_at: toLaravelTimestamp(token.createdAt),
    last_used_at: toLaravelTimestamp(token.lastUsedAt),
    expires_at: toLaravelTimestamp(token.expiresAt),
    expired: token.expiresAt != null && new Date(token.expiresAt).getTime() < now,
  }))
})
