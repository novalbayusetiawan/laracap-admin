import type { Bundle } from '../server/database/schema'

/** Minimal Bundle factory for pure-domain tests (no DB). Unconstrained by default. */
export function makeBundle(overrides: Partial<Bundle> = {}): Bundle {
  return {
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    name: 'v1.0.0',
    description: null,
    size: 1024,
    filePath: 'bundles/abc123.zip',
    applicationId: 1,
    channelId: 1,
    androidMinVersionCode: null,
    androidMaxVersionCode: null,
    androidEqVersionCode: null,
    iosMinVersionCode: null,
    iosMaxVersionCode: null,
    iosEqVersionCode: null,
    createdAt: '2026-01-01 00:00:00',
    updatedAt: '2026-01-01 00:00:00',
    ...overrides,
  }
}
