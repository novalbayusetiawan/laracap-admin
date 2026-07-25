import type { Bundle } from '../../database/schema'
import { toLaravelTimestamp } from '../serialization'

/**
 * The frozen Bundle JSON shape (docs/02-data-model.md). Keys are snake_case and ordered
 * to match legacy raw model serialization. Returned verbatim by OTA + upload endpoints.
 */
export interface BundleJson {
  id: number
  uuid: string
  name: string | null
  description: string | null
  size: number
  file_path: string
  application_id: number
  channel_id: number | null
  android_min_version_code: number | null
  android_max_version_code: number | null
  android_eq_version_code: number | null
  ios_min_version_code: number | null
  ios_max_version_code: number | null
  ios_eq_version_code: number | null
  created_at: string | null
  updated_at: string | null
}

export function serializeBundle(bundle: Bundle): BundleJson {
  return {
    id: bundle.id,
    uuid: bundle.uuid,
    name: bundle.name,
    description: bundle.description,
    size: bundle.size,
    file_path: bundle.filePath,
    application_id: bundle.applicationId,
    channel_id: bundle.channelId,
    android_min_version_code: bundle.androidMinVersionCode,
    android_max_version_code: bundle.androidMaxVersionCode,
    android_eq_version_code: bundle.androidEqVersionCode,
    ios_min_version_code: bundle.iosMinVersionCode,
    ios_max_version_code: bundle.iosMaxVersionCode,
    ios_eq_version_code: bundle.iosEqVersionCode,
    created_at: toLaravelTimestamp(bundle.createdAt),
    updated_at: toLaravelTimestamp(bundle.updatedAt),
  }
}
