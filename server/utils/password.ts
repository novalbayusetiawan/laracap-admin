import { compare, hash } from 'bcryptjs'

/**
 * Password hashing — bcrypt, NOT scrypt.
 *
 * nuxt-auth-utils ships its own scrypt-based hashPassword/verifyPassword (auto-imported in
 * server/), but the strict-compat requirement (docs/07-auth-and-tenancy.md) is that migrated
 * Laravel users log in with their EXISTING bcrypt hashes without a reset. So we own password
 * verify/hash with bcryptjs under distinct names (avoiding the auto-import collision) and use
 * nuxt-auth-utils purely for sealed-cookie sessions.
 *
 * Laravel emits `$2y$` hashes; bcryptjs expects `$2a$/$2b$`. `$2y$` is functionally identical,
 * so we normalise the prefix before verifying.
 */

const BCRYPT_ROUNDS = 12 // matches Laravel's default cost

export function verifyBcryptPassword(plain: string, hashed: string): Promise<boolean> {
  const normalized = hashed.startsWith('$2y$') ? '$2b$' + hashed.slice(4) : hashed
  return compare(plain, normalized)
}

export function hashBcryptPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS)
}
