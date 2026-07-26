import { and, eq } from 'drizzle-orm'
import { useDatabase } from '~~/server/database/client'
import { applications, bundles, channels } from '~~/server/database/schema'
import { serializeBundle } from '~~/server/utils/serializers/bundle'
import { requireSessionUser } from '~~/server/utils/session-auth'

/**
 * PATCH /api/admin/bundles/:id — edit metadata (name, description, channel,
 * version constraints). The file itself is immutable; re-upload for new assets.
 */
export default defineEventHandler(async (event) => {
  const user = await requireSessionUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const body = await readBody<Record<string, unknown>>(event).catch(() => null)
  const name = typeof body?.name === 'string' && body.name.trim() !== '' ? body.name.trim() : null
  const description = typeof body?.description === 'string' && body.description !== '' ? body.description : null

  const intOrNull = (v: unknown, field: string): number | null => {
    if (v == null || v === '') return null
    const n = Number(v)
    if (!Number.isInteger(n) || n < 0) {
      throw createError({ statusCode: 422, statusMessage: `The ${field} must be a non-negative integer.` })
    }
    return n
  }
  const constraintFields = {
    androidMinVersionCode: intOrNull(body?.android_min_version_code, 'android min version code'),
    androidMaxVersionCode: intOrNull(body?.android_max_version_code, 'android max version code'),
    androidEqVersionCode: intOrNull(body?.android_eq_version_code, 'android eq version code'),
    iosMinVersionCode: intOrNull(body?.ios_min_version_code, 'ios min version code'),
    iosMaxVersionCode: intOrNull(body?.ios_max_version_code, 'ios max version code'),
    iosEqVersionCode: intOrNull(body?.ios_eq_version_code, 'ios eq version code'),
  }

  const db = useDatabase(event)
  const [row] = await db
    .select({ bundle: bundles, ownerId: applications.userId })
    .from(bundles)
    .innerJoin(applications, eq(bundles.applicationId, applications.id))
    .where(eq(bundles.id, id))
    .limit(1)
  if (!row || (!user.isAdmin && row.ownerId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  // Channel: null/'' clears; otherwise must be a channel of the same application.
  let channelId: number | null = null
  if (body?.channel_id != null && body.channel_id !== '') {
    const cid = Number(body.channel_id)
    const [chan] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.id, cid), eq(channels.applicationId, row.bundle.applicationId)))
      .limit(1)
    if (!chan) {
      throw createError({ statusCode: 422, statusMessage: 'The selected channel is invalid.' })
    }
    channelId = chan.id
  }

  const [updated] = await db
    .update(bundles)
    .set({
      name,
      description,
      channelId,
      ...constraintFields,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bundles.id, id))
    .returning()

  return serializeBundle(updated!)
})
