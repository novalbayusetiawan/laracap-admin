import type { User } from '../../database/schema'
import { toLaravelTimestamp } from '../serialization'

/**
 * Frozen User JSON shape (docs/03-api-contract.md §"Current User"). Password and
 * remember_token are never serialized; is_admin is a real boolean.
 */
export interface UserJson {
  id: number
  name: string
  email: string
  email_verified_at: string | null
  is_admin: boolean
  created_at: string | null
  updated_at: string | null
}

export function serializeUser(user: User): UserJson {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    email_verified_at: toLaravelTimestamp(user.emailVerifiedAt),
    is_admin: user.isAdmin,
    created_at: toLaravelTimestamp(user.createdAt),
    updated_at: toLaravelTimestamp(user.updatedAt),
  }
}
