import { useDatabase } from '~~/server/database/client'
import { findApplicationByUuid, resolveLatestCompatibleBundle } from '~~/server/services/bundles'
import { trackDevice } from '~~/server/services/device-tracking'
import { resolveOtaInputs } from '~~/server/utils/ota-inputs'

/**
 * GET /api/applications/:uuid/bundles/latest/download — public OTA download
 * (route name: latest-app-bundle-download). Frozen contract: docs/03-api-contract.md,
 * ADR 002. Streams the ZIP from R2; never redirects to a public R2 URL.
 */
export default defineEventHandler(async (event) => {
  const uuid = getRouterParam(event, 'uuid')!
  const db = useDatabase(event)

  const application = await findApplicationByUuid(db, uuid)
  if (!application) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const inputs = await resolveOtaInputs(event)
  const bundle = await resolveLatestCompatibleBundle(
    db,
    application,
    inputs.channel,
    inputs.platform ?? '',
    inputs.appVersionCode,
  )

  // Device tracking (type=download) with the resolved bundle id.
  if (inputs.deviceIdentifier && inputs.platform) {
    trackDevice(event, {
      deviceIdentifier: inputs.deviceIdentifier,
      platform: inputs.platform,
      ip: getRequestIP(event, { xForwardedFor: true }) ?? null,
      userAgent: getHeader(event, 'user-agent') ?? null,
      bundleId: bundle?.id ?? null,
      applicationId: application.id,
      type: 'download',
    })
  }

  if (!bundle) {
    // Exact legacy body — cap-update relies on this shape.
    setResponseStatus(event, 404)
    return { message: 'No bundle found' }
  }

  const r2 = event.context.cloudflare?.env?.BUNDLES as R2Bucket | undefined
  if (!r2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 binding "BUNDLES" not available' })
  }

  const object = await r2.get(bundle.filePath)
  if (!object) {
    setResponseStatus(event, 404)
    return { message: 'No bundle found' }
  }

  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${bundle.name ?? bundle.uuid}.zip"`,
    'X-Bundle-Id': String(bundle.id),
    'X-Bundle-Uuid': bundle.uuid,
  })

  return object.body
})
