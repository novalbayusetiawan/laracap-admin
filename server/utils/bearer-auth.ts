import type { H3Event } from 'h3'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { useDatabase } from '../database/client'
import { personalAccessTokens, users, type PersonalAccessToken, type User } from '../database/schema'
import { sha256Hex } from './crypto'

/**
 * Bearer token auth (Sanctum-compatible) for laracap-cli (docs/07-auth-and-tenancy.md).
 *
 * Laravel Sanctum tokens are `{id}|{plainText}`; only the SHA-256 of the plain part is
 * stored. We hash the presented token the same way and match against the stored hash.
 */

export interface BearerAuth {
  user: User
  token: PersonalAccessToken
}

function extractPlainToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) return null
  const raw = authorization.slice(7).trim()
  if (!raw) return null
  // Sanctum format "{id}|{token}" — hash only the part after the pipe.
  const pipe = raw.indexOf('|')
  return pipe === -1 ? raw : raw.slice(pipe + 1)
}

/** Resolve the authenticated user + token record from a Bearer token, or null. */
export async function resolveBearerAuth(event: H3Event): Promise<BearerAuth | null> {
  const plain = extractPlainToken(getHeader(event, 'authorization'))
  if (!plain) return null

  const db = useDatabase(event)
  const tokenHash = await sha256Hex(plain)
  const nowIso = new Date().toISOString()

  const [row] = await db
    .select({ user: users, token: personalAccessTokens })
    .from(personalAccessTokens)
    .innerJoin(
      users,
      and(
        eq(personalAccessTokens.tokenableId, users.id),
        eq(personalAccessTokens.tokenableType, 'App\\Models\\User'),
      ),
    )
    .where(
      and(
        eq(personalAccessTokens.token, tokenHash),
        or(isNull(personalAccessTokens.expiresAt), gt(personalAccessTokens.expiresAt, nowIso)),
      ),
    )
    .limit(1)

  return row ?? null
}

/** Require a Bearer-authenticated user or throw 401 (Sanctum message shape). */
export async function requireBearerAuth(event: H3Event): Promise<BearerAuth> {
  const auth = await resolveBearerAuth(event)
  if (!auth) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthenticated.' })
  }
  return auth
}

/** Convenience: require and return just the user. */
export async function requireBearerUser(event: H3Event): Promise<User> {
  return (await requireBearerAuth(event)).user
}
