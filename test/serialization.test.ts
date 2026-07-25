import { describe, expect, it } from 'vitest'
import { toLaravelTimestamp } from '../server/utils/serialization'
import { serializeBundle } from '../server/utils/serializers/bundle'
import { makeBundle } from './factories'

/**
 * Timestamp + JSON shape are part of the FROZEN contract (docs/03-api-contract.md).
 * Laravel emits ISO 8601 with 6-digit microseconds and a trailing Z.
 */
describe('toLaravelTimestamp', () => {
  it('formats a SQLite datetime string as Y-m-d\\TH:i:s.uuuuuuZ', () => {
    expect(toLaravelTimestamp('2026-06-13 05:54:19')).toBe('2026-06-13T05:54:19.000000Z')
  })

  it('preserves millisecond precision padded to 6 digits', () => {
    expect(toLaravelTimestamp('2026-06-13T05:54:19.123Z')).toBe('2026-06-13T05:54:19.123000Z')
  })

  it('returns null for empty / invalid input', () => {
    expect(toLaravelTimestamp(null)).toBeNull()
    expect(toLaravelTimestamp('')).toBeNull()
    expect(toLaravelTimestamp('not-a-date')).toBeNull()
  })
})

describe('serializeBundle', () => {
  it('produces the exact frozen snake_case Bundle JSON shape', () => {
    const json = serializeBundle(
      makeBundle({
        id: 42,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        name: 'v1.2.0',
        size: 1048576,
        filePath: 'bundles/abc123.zip',
        applicationId: 1,
        channelId: 2,
        createdAt: '2026-06-13 05:54:19',
        updatedAt: '2026-06-13 05:54:19',
      }),
    )

    expect(json).toEqual({
      id: 42,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      name: 'v1.2.0',
      description: null,
      size: 1048576,
      file_path: 'bundles/abc123.zip',
      application_id: 1,
      channel_id: 2,
      android_min_version_code: null,
      android_max_version_code: null,
      android_eq_version_code: null,
      ios_min_version_code: null,
      ios_max_version_code: null,
      ios_eq_version_code: null,
      created_at: '2026-06-13T05:54:19.000000Z',
      updated_at: '2026-06-13T05:54:19.000000Z',
    })
  })

  it('emits keys in the legacy order', () => {
    const keys = Object.keys(serializeBundle(makeBundle()))
    expect(keys).toEqual([
      'id',
      'uuid',
      'name',
      'description',
      'size',
      'file_path',
      'application_id',
      'channel_id',
      'android_min_version_code',
      'android_max_version_code',
      'android_eq_version_code',
      'ios_min_version_code',
      'ios_max_version_code',
      'ios_eq_version_code',
      'created_at',
      'updated_at',
    ])
  })
})
