import type { Bundle } from '../database/schema'

/**
 * Native version constraint logic (docs/04-ota-protocol.md, docs/12-business-rules-and-quirks.md).
 *
 * Pure domain functions — no DB, no framework. This is the frozen-contract core and the
 * primary P0 test target. Semantics (Capawesome-aligned):
 *   - min: client versionCode must be >= min
 *   - max: client versionCode must be <= max
 *   - eq:  client versionCode must NOT equal eq (exclude an exact native build)
 *   - web platform: constraints skipped entirely
 *   - constrained bundle + missing version header on ios/android => incompatible
 */

export type Platform = 'ios' | 'android' | 'web' | string

type ConstraintTriple = {
  min: number | null
  max: number | null
  eq: number | null
}

function constraintsFor(bundle: Bundle, platform: 'ios' | 'android'): ConstraintTriple {
  return platform === 'android'
    ? {
        min: bundle.androidMinVersionCode,
        max: bundle.androidMaxVersionCode,
        eq: bundle.androidEqVersionCode,
      }
    : {
        min: bundle.iosMinVersionCode,
        max: bundle.iosMaxVersionCode,
        eq: bundle.iosEqVersionCode,
      }
}

/** True if the bundle declares any native version constraint for the given platform. */
export function hasNativeVersionConstraints(bundle: Bundle, platform: 'ios' | 'android'): boolean {
  const { min, max, eq } = constraintsFor(bundle, platform)
  return min !== null || max !== null || eq !== null
}

/**
 * Whether a bundle is eligible for a device on `platform` running native `versionCode`.
 * Mirrors NativeVersionConstraintService::isCompatibleWith.
 */
export function isCompatibleWith(
  bundle: Bundle,
  platform: Platform,
  versionCode: number | null,
): boolean {
  if (platform !== 'android' && platform !== 'ios') return true // web / unknown: skip
  if (!hasNativeVersionConstraints(bundle, platform)) return true
  if (versionCode === null) return false // constrained but no version supplied

  const { min, max, eq } = constraintsFor(bundle, platform)
  if (min !== null && versionCode < min) return false
  if (max !== null && versionCode > max) return false
  if (eq !== null && versionCode === eq) return false
  return true
}

/**
 * Walk bundles newest-first (must be pre-ordered created_at DESC) and return the first
 * compatible one, or null. Allows an older bundle to serve devices excluded from the newest.
 */
export function findLatestCompatibleBundle(
  bundlesNewestFirst: readonly Bundle[],
  platform: Platform,
  versionCode: number | null,
): Bundle | null {
  return bundlesNewestFirst.find((b) => isCompatibleWith(b, platform, versionCode)) ?? null
}

/**
 * Update availability decision (docs/03-api-contract.md §6).
 * Uses STRING comparison on bundle ids so rollbacks / channel switches are detected.
 */
export function computeIsUpdateAvailable(
  latestBundle: Bundle | null,
  channelBundleId: string | null,
): boolean {
  if (!latestBundle) return false
  if (!channelBundleId) return true
  return String(latestBundle.id) !== String(channelBundleId)
}
