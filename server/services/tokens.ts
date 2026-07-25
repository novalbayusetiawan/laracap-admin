import type { Database } from '../database/client'
import { personalAccessTokens, type User } from '../database/schema'
import { sha256Hex } from '../utils/crypto'

/**
 * Personal access token service (Sanctum-compatible). Docs/07-auth-and-tenancy.md.
 * Only the SHA-256 hash is persisted; the plain `{id}|{token}` is returned once.
 */

const PLAIN_TOKEN_BYTES = 40

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(PLAIN_TOKEN_BYTES))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface CreatedToken {
  /** Plain text token to return to the client exactly once: `{id}|{token}`. */
  plainTextToken: string
  id: number
}

export async function createToken(
  db: Database,
  user: User,
  name: string,
  abilities: string[] = ['*'],
  expiresAt: string | null = null,
): Promise<CreatedToken> {
  const plain = randomToken()
  const nowIso = new Date().toISOString()

  const [row] = await db
    .insert(personalAccessTokens)
    .values({
      tokenableType: 'App\\Models\\User',
      tokenableId: user.id,
      name,
      token: await sha256Hex(plain),
      abilities: JSON.stringify(abilities),
      expiresAt,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .returning({ id: personalAccessTokens.id })

  const id = row!.id
  return { id, plainTextToken: `${id}|${plain}` }
}
