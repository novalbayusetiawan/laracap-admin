import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDatabase } from '../database/client'
import { deviceLogs, devices } from '../database/schema'

/**
 * Device tracking (docs/08-device-tracking.md).
 *
 * Runs fire-and-forget via ctx.waitUntil() — NOT Cloudflare Queues. Queues' free tier is
 * 10k ops/day and typically requires the Paid plan; tracking is best-effort analytics where
 * a dropped record is acceptable. waitUntil runs after the response is flushed, so it never
 * adds latency to the OTA check/download.
 */

export interface TrackDeviceInput {
  deviceIdentifier: string
  platform: string
  ip: string | null
  userAgent: string | null
  bundleId: number | null
  applicationId: number
  type: 'check' | 'download'
}

interface GeoResult {
  country: string | null
  city: string | null
}

const GEO_CACHE_TTL_SECONDS = 86_400 // 24h
const SKIP_IPS = new Set(['127.0.0.1', '::1'])

/** Resolve geo from Cloudflare edge headers first (free), then KV-cached ip-api fallback. */
async function resolveGeo(
  event: H3Event,
  ip: string | null,
  cache: KVNamespace | undefined,
): Promise<GeoResult> {
  const cfCountry = getHeader(event, 'cf-ipcountry')
  const cf = (event.context.cloudflare?.request as Request | undefined)?.cf as
    | { country?: string, city?: string }
    | undefined

  if (cf?.city || cf?.country || cfCountry) {
    return { country: cf?.country ?? cfCountry ?? null, city: cf?.city ?? null }
  }

  if (!ip || SKIP_IPS.has(ip) || !cache) return { country: null, city: null }

  const cacheKey = `ip_location_${ip}`
  const cached = await cache.get<GeoResult>(cacheKey, 'json').catch(() => null)
  if (cached) return cached

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`)
    const data = (await res.json()) as { status?: string, country?: string, city?: string }
    const geo: GeoResult =
      data.status === 'success'
        ? { country: data.country ?? null, city: data.city ?? null }
        : { country: null, city: null }
    await cache.put(cacheKey, JSON.stringify(geo), { expirationTtl: GEO_CACHE_TTL_SECONDS })
    return geo
  } catch {
    return { country: null, city: null }
  }
}

/** Parse OS version + device model from a native Android User-Agent (best-effort). */
function parseUserAgent(ua: string | null): { osVersion: string | null, deviceModel: string | null } {
  if (!ua) return { osVersion: null, deviceModel: null }
  const paren = ua.match(/\(([^)]*)\)/)?.[1] ?? ''
  const parts = paren.split(';').map((p) => p.trim())
  const osVersion = parts.find((p) => p.includes('Android')) ?? null
  const buildPart = parts.find((p) => p.includes('Build/'))
  const deviceModel = buildPart ? buildPart.split('Build/')[0]!.trim().split(/\s+/)[0] ?? null : null
  return { osVersion, deviceModel }
}

/** Persist a device check-in + log row. Swallows errors (best-effort analytics). */
async function persist(event: H3Event, input: TrackDeviceInput, geo: GeoResult, nowIso: string) {
  const db = useDatabase(event)
  const ua = parseUserAgent(input.userAgent)

  const [device] = await db
    .insert(devices)
    .values({
      deviceIdentifier: input.deviceIdentifier,
      platform: input.platform,
      bundleId: input.bundleId,
      lastActiveAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: devices.deviceIdentifier,
      set: { platform: input.platform, bundleId: input.bundleId, lastActiveAt: nowIso, updatedAt: nowIso },
    })
    .returning()

  const deviceId = device?.id
    ?? (await db.select({ id: devices.id }).from(devices).where(eq(devices.deviceIdentifier, input.deviceIdentifier)).limit(1))[0]?.id

  if (!deviceId) return

  await db.insert(deviceLogs).values({
    deviceId,
    applicationId: input.applicationId,
    bundleId: input.bundleId,
    ipAddress: input.ip,
    userAgent: input.userAgent,
    country: geo.country,
    city: geo.city,
    osVersion: ua.osVersion,
    deviceModel: ua.deviceModel,
    type: input.type,
    createdAt: nowIso,
    updatedAt: nowIso,
  })
}

/**
 * Schedule device tracking without blocking the response.
 * Only runs when both device_identifier and platform are present (docs contract).
 */
export function trackDevice(event: H3Event, input: TrackDeviceInput): void {
  const ctx = event.context.cloudflare?.context
  const cache = event.context.cloudflare?.env?.CACHE as KVNamespace | undefined
  const nowIso = new Date().toISOString()

  const work = (async () => {
    try {
      const geo = await resolveGeo(event, input.ip, cache)
      await persist(event, input, geo, nowIso)
    } catch {
      // best-effort: never surface tracking failures to the client
    }
  })()

  if (ctx?.waitUntil) {
    ctx.waitUntil(work)
  } else {
    // Test/dev fallback: await inline so behaviour is observable.
    void work
  }
}
