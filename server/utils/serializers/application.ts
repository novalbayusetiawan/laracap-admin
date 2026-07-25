import type { Application } from '../../database/schema'
import { toLaravelTimestamp } from '../serialization'

/** Frozen Application JSON shape (docs/03-api-contract.md §"List Applications"). */
export interface ApplicationJson {
  id: number
  uuid: string
  name: string
  slug: string
  description: string | null
  bundle_limit: number | null
  user_id: number | null
  created_at: string | null
  updated_at: string | null
}

export function serializeApplication(app: Application): ApplicationJson {
  return {
    id: app.id,
    uuid: app.uuid,
    name: app.name,
    slug: app.slug,
    description: app.description,
    bundle_limit: app.bundleLimit,
    user_id: app.userId,
    created_at: toLaravelTimestamp(app.createdAt),
    updated_at: toLaravelTimestamp(app.updatedAt),
  }
}
