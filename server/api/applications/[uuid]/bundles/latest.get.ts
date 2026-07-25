import { useDatabase } from '~~/server/database/client'
import { computeIsUpdateAvailable } from '~~/server/domain/version-constraints'
import {
  findApplicationByUuid,
  findBundleById,
  resolveLatestCompatibleBundle,
} from '~~/server/services/bundles'
import { trackDevice } from '~~/server/services/device-tracking'
import { resolveOtaInputs } from '~~/server/utils/ota-inputs'
import { serializeBundle } from '~~/server/utils/serializers/bundle'

/**
 * GET /api/applications/:uuid/bundles/latest — public OTA check (route name: latest-app-bundle).
 * Frozen contract: docs/03-api-contract.md §"Check for Update".
 */
export default defineEventHandler(async (event) => {
  const uuid = getRouterParam(event, 'uuid')!
  const db = useDatabase(event)

  const application = await findApplicationByUuid(db, uuid)
  if (!application) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const inputs = await resolveOtaInputs(event)

  const latestBundle = await resolveLatestCompatibleBundle(
    db,
    application,
    inputs.channel,
    inputs.platform ?? '',
    inputs.appVersionCode,
  )

  // Device tracking (type=check) — only when identifier + platform present.
  if (inputs.deviceIdentifier && inputs.platform) {
    const parsedBundleId = inputs.bundleId !== null ? Number.parseInt(inputs.bundleId, 10) : Number.NaN
    let trackedBundleId: number | null = Number.isNaN(parsedBundleId) ? null : parsedBundleId
    if (trackedBundleId !== null && !(await findBundleById(db, trackedBundleId))) {
      trackedBundleId = null // bundle_id given but no matching row → null (docs contract)
    }
    trackDevice(event, {
      deviceIdentifier: inputs.deviceIdentifier,
      platform: inputs.platform,
      ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
      userAgent: getHeader(event, 'user-agent') ?? null,
      bundleId: trackedBundleId,
      applicationId: application.id,
      type: 'check',
    })
  }

  const isUpdateAvailable = computeIsUpdateAvailable(latestBundle, inputs.channelBundleId)

  // current_bundle: load by numeric bundle_id if valid, else null.
  const currentBundleId = inputs.bundleId !== null ? Number.parseInt(inputs.bundleId, 10) : Number.NaN
  const currentBundle = !Number.isNaN(currentBundleId) ? await findBundleById(db, currentBundleId) : null

  const appUrl = (useRuntimeConfig(event).public.appUrl || getRequestURL(event).origin).replace(/\/$/, '')
  const downloadUrl = latestBundle
    ? `${appUrl}/api/applications/${application.uuid}/bundles/latest/download?channel=${encodeURIComponent(inputs.channel)}`
    : null

  return {
    is_update_available: isUpdateAvailable,
    latest_bundle: latestBundle ? serializeBundle(latestBundle) : null,
    current_bundle: currentBundle ? serializeBundle(currentBundle) : null,
    download_url: downloadUrl,
  }
})
