import type { H3Event } from 'h3'

/**
 * OTA request input resolution (docs/03-api-contract.md).
 * Body/query parameters take precedence over headers; headers are the native-client fallback.
 */
export interface OtaInputs {
  deviceIdentifier: string | null
  platform: string | null
  bundleId: string | null
  channel: string
  channelBundleId: string | null
  appVersionCode: number | null
}

const DEFAULT_CHANNEL = 'production'

function firstDefined(...values: (string | null | undefined)[]): string | null {
  for (const v of values) {
    if (v !== null && v !== undefined && v !== '') return v
  }
  return null
}

export async function resolveOtaInputs(event: H3Event): Promise<OtaInputs> {
  const query = getQuery(event)
  // Body may be absent (GET). Guard so download/check work with query+headers only.
  const body = await readBody(event).catch(() => ({}) as Record<string, unknown>)

  const pick = (key: string, header: string): string | null =>
    firstDefined(
      body?.[key] as string | undefined,
      query?.[key] as string | undefined,
      getHeader(event, header),
    )

  const platform = pick('platform', 'x-platform')
  const bundleId = pick('bundle_id', 'x-bundle-id')
  const channel = pick('channel', 'x-channel') ?? DEFAULT_CHANNEL

  // channelBundleId chain: channel_bundle_id ?? X-Channel-Bundle-Id ?? bundle_id
  const channelBundleId = firstDefined(pick('channel_bundle_id', 'x-channel-bundle-id'), bundleId)

  const rawVersion = pick('app_version_code', 'x-app-version-code')
  const parsedVersion = rawVersion !== null ? Number.parseInt(rawVersion, 10) : Number.NaN

  return {
    deviceIdentifier: pick('device_identifier', 'x-device-identifier'),
    platform,
    bundleId,
    channel,
    channelBundleId,
    appVersionCode: Number.isNaN(parsedVersion) ? null : parsedVersion,
  }
}
