import { describe, expect, it } from 'vitest'
import {
  computeIsUpdateAvailable,
  findLatestCompatibleBundle,
  hasNativeVersionConstraints,
  isCompatibleWith,
} from '../server/domain/version-constraints'
import { makeBundle } from './factories'

/**
 * P0 — NativeVersionConstraintTest (docs/11-test-matrix.md).
 * Pure domain logic; the frozen-contract core for cap-update compatibility.
 */
describe('isCompatibleWith', () => {
  it('unconstrained bundle is compatible for any platform, even without a version header', () => {
    const bundle = makeBundle()
    expect(isCompatibleWith(bundle, 'android', null)).toBe(true)
    expect(isCompatibleWith(bundle, 'ios', 123)).toBe(true)
    expect(isCompatibleWith(bundle, 'web', null)).toBe(true)
  })

  it('web platform skips constraints entirely', () => {
    const bundle = makeBundle({ androidMinVersionCode: 10, androidMaxVersionCode: 12 })
    expect(isCompatibleWith(bundle, 'web', null)).toBe(true)
  })

  it('android min/max window (min=10, max=12): 9→false, 11→true, 13→false', () => {
    const bundle = makeBundle({ androidMinVersionCode: 10, androidMaxVersionCode: 12 })
    expect(isCompatibleWith(bundle, 'android', 9)).toBe(false)
    expect(isCompatibleWith(bundle, 'android', 11)).toBe(true)
    expect(isCompatibleWith(bundle, 'android', 13)).toBe(false)
  })

  it('android eq exclusion (min=10, max=12, eq=11): 11→false, 10→true', () => {
    const bundle = makeBundle({
      androidMinVersionCode: 10,
      androidMaxVersionCode: 12,
      androidEqVersionCode: 11,
    })
    expect(isCompatibleWith(bundle, 'android', 11)).toBe(false)
    expect(isCompatibleWith(bundle, 'android', 10)).toBe(true)
  })

  it('constrained bundle + missing version header → incompatible', () => {
    const bundle = makeBundle({ androidMinVersionCode: 10 })
    expect(isCompatibleWith(bundle, 'android', null)).toBe(false)
  })

  it('ios constraints are independent of android', () => {
    const bundle = makeBundle({ iosMinVersionCode: 100, iosMaxVersionCode: 200 })
    expect(isCompatibleWith(bundle, 'ios', 150)).toBe(true)
    expect(isCompatibleWith(bundle, 'ios', 50)).toBe(false)
    // android unconstrained on the same bundle → always compatible
    expect(isCompatibleWith(bundle, 'android', 1)).toBe(true)
  })
})

describe('hasNativeVersionConstraints', () => {
  it('detects per-platform constraints', () => {
    expect(hasNativeVersionConstraints(makeBundle(), 'android')).toBe(false)
    expect(hasNativeVersionConstraints(makeBundle({ iosEqVersionCode: 5 }), 'ios')).toBe(true)
    expect(hasNativeVersionConstraints(makeBundle({ iosEqVersionCode: 5 }), 'android')).toBe(false)
  })
})

describe('findLatestCompatibleBundle', () => {
  it('falls back to an older unconstrained bundle when the newest is incompatible', () => {
    const newest = makeBundle({ id: 2, androidMinVersionCode: 20 }) // needs version >= 20
    const older = makeBundle({ id: 1 }) // unconstrained
    // Ordered newest-first, as the service supplies it.
    const result = findLatestCompatibleBundle([newest, older], 'android', 11)
    expect(result?.id).toBe(1)
  })

  it('returns null when nothing is compatible', () => {
    const only = makeBundle({ id: 5, androidMinVersionCode: 20 })
    expect(findLatestCompatibleBundle([only], 'android', 11)).toBeNull()
  })

  it('returns the newest when it is compatible', () => {
    const newest = makeBundle({ id: 9 })
    const older = makeBundle({ id: 3 })
    expect(findLatestCompatibleBundle([newest, older], 'android', 11)?.id).toBe(9)
  })
})

describe('computeIsUpdateAvailable', () => {
  it('false when there is no latest bundle', () => {
    expect(computeIsUpdateAvailable(null, '5')).toBe(false)
  })

  it('true when no channel bundle id is known', () => {
    expect(computeIsUpdateAvailable(makeBundle({ id: 5 }), null)).toBe(true)
  })

  it('false when latest id matches the channel bundle id', () => {
    expect(computeIsUpdateAvailable(makeBundle({ id: 5 }), '5')).toBe(false)
  })

  it('detects rollback via string inequality (latest id decreased)', () => {
    // Device is on id 8, server rolled back to id 5 → update available.
    expect(computeIsUpdateAvailable(makeBundle({ id: 5 }), '8')).toBe(true)
  })
})
