import { describe, expect, it } from 'vitest'
import { serializeApplication } from '../server/utils/serializers/application'
import { serializeUser } from '../server/utils/serializers/user'
import { isUuid, parseVersionCode } from '../server/utils/validation'

describe('isUuid', () => {
  it('accepts canonical uuids, rejects numeric ids and junk', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
    expect(isUuid('42')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid('550e8400e29b41d4a716446655440000')).toBe(false)
  })
})

describe('parseVersionCode', () => {
  it('absent/empty → null', () => {
    expect(parseVersionCode(undefined, 'x')).toBeNull()
    expect(parseVersionCode('', 'x')).toBeNull()
  })

  it('parses non-negative integers', () => {
    expect(parseVersionCode('0', 'x')).toBe(0)
    expect(parseVersionCode('42', 'x')).toBe(42)
  })

  it('throws 422 on negatives and non-integers', () => {
    expect(() => parseVersionCode('-1', 'x')).toThrowError()
    expect(() => parseVersionCode('1.5', 'x')).toThrowError()
    expect(() => parseVersionCode('abc', 'x')).toThrowError()
  })
})

describe('serializeUser', () => {
  it('frozen shape: snake_case, no password/remember_token leakage', () => {
    const json = serializeUser({
      id: 1,
      name: 'Admin',
      email: 'admin@example.com',
      emailVerifiedAt: '2026-01-01 00:00:00',
      password: '$2y$12$secret',
      isAdmin: true,
      rememberToken: 'tok',
      createdAt: '2026-01-01 00:00:00',
      updatedAt: '2026-01-01 00:00:00',
    } as never)

    expect(json).toEqual({
      id: 1,
      name: 'Admin',
      email: 'admin@example.com',
      email_verified_at: '2026-01-01T00:00:00.000000Z',
      is_admin: true,
      created_at: '2026-01-01T00:00:00.000000Z',
      updated_at: '2026-01-01T00:00:00.000000Z',
    })
    expect('password' in json).toBe(false)
    expect('remember_token' in json).toBe(false)
  })
})

describe('serializeApplication', () => {
  it('frozen shape incl. nullable bundle_limit', () => {
    const json = serializeApplication({
      id: 7,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      name: 'My App',
      slug: 'my-app',
      description: null,
      bundleLimit: null,
      userId: 1,
      createdAt: '2026-01-01 00:00:00',
      updatedAt: '2026-01-01 00:00:00',
    } as never)

    expect(json).toEqual({
      id: 7,
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      name: 'My App',
      slug: 'my-app',
      description: null,
      bundle_limit: null,
      user_id: 1,
      created_at: '2026-01-01T00:00:00.000000Z',
      updated_at: '2026-01-01T00:00:00.000000Z',
    })
  })
})
