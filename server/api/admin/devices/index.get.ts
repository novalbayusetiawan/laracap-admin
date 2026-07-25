import { desc, eq, inArray } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, deviceLogs, devices } from '~~/server/database/schema'
import { toLaravelTimestamp } from '~~/server/utils/serialization'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * GET /api/admin/devices — read-only fleet view (docs/06 §DeviceResource).
 * Admin: all; non-admin: via bundle.application.user_id. Order last_active_at desc.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const db = useDatabase(event)

  const rows = await db
    .select({ device: devices, bundleName: bundles.name, appName: applications.name })
    .from(devices)
    .leftJoin(bundles, eq(devices.bundleId, bundles.id))
    .leftJoin(applications, eq(bundles.applicationId, applications.id))
    .where(user.isAdmin ? undefined : eq(applications.userId, user.id))
    .orderBy(desc(devices.lastActiveAt))

  // Latest log per device for IP / location / OS columns (single query, newest first wins).
  const ids = rows.map((r) => r.device.id)
  const latest = new Map<number, typeof deviceLogs.$inferSelect>()
  if (ids.length) {
    const logs = await db
      .select()
      .from(deviceLogs)
      .where(inArray(deviceLogs.deviceId, ids))
      .orderBy(desc(deviceLogs.id))
    for (const log of logs) {
      if (!latest.has(log.deviceId)) latest.set(log.deviceId, log)
    }
  }

  return rows.map(({ device, bundleName, appName }) => {
    const log = latest.get(device.id)
    const location = [log?.city, log?.country].filter(Boolean).join(', ') || 'Unknown'
    return {
      id: device.id,
      device_identifier: device.deviceIdentifier,
      platform: device.platform,
      application_name: appName,
      bundle_name: bundleName,
      ip_address: log?.ipAddress ?? null,
      location,
      os_version: log?.osVersion ?? null,
      device_model: log?.deviceModel ?? null,
      last_active_at: toLaravelTimestamp(device.lastActiveAt),
      created_at: toLaravelTimestamp(device.createdAt),
    }
  })
})
