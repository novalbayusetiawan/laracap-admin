import { and, eq } from 'drizzle-orm'
import type { Database } from '../database/client'
import { type Application, type Bundle, bundles, channels } from '../database/schema'
import { pruneBundles } from './bundle-retention'
import { parseVersionCode } from '../utils/validation'

/**
 * Shared bundle creation core (docs/03 §Upload Bundle) used by both the CLI
 * endpoint (Bearer) and the admin UI endpoint (session). Caller has already
 * resolved the application and enforced ownership + the null-safe limit gate.
 */

export interface UploadInput {
  form: FormData
  file: File
}

class UploadError extends Error {
  constructor(public statusCode: number, public statusMessage: string) {
    super(statusMessage)
  }
}

/**
 * Resolve a channel by name within an app, creating it if absent.
 * Note: (application_id, name) is intentionally NOT unique (legacy quirk), so
 * this is select-then-insert; a rare concurrent double-create is tolerable and
 * harmless (OTA resolution picks the newest compatible bundle regardless).
 */
export async function resolveOrCreateChannelByName(
  db: Database,
  applicationId: number,
  name: string,
): Promise<number> {
  const [existing] = await db
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.name, name), eq(channels.applicationId, applicationId)))
    .limit(1)
  if (existing) return existing.id

  const nowIso = new Date().toISOString()
  const [created] = await db
    .insert(channels)
    .values({ uuid: crypto.randomUUID(), name, applicationId, createdAt: nowIso, updatedAt: nowIso })
    .returning({ id: channels.id })
  return created!.id
}

export async function createBundle(
  db: Database,
  r2: R2Bucket,
  application: Application,
  { form, file }: UploadInput,
): Promise<Bundle> {
  const androidMin = parseVersionCode(form.get('android_min_version_code'), 'android_min_version_code')
  const androidMax = parseVersionCode(form.get('android_max_version_code'), 'android_max_version_code')
  const androidEq = parseVersionCode(form.get('android_eq_version_code'), 'android_eq_version_code')
  const iosMin = parseVersionCode(form.get('ios_min_version_code'), 'ios_min_version_code')
  const iosMax = parseVersionCode(form.get('ios_max_version_code'), 'ios_max_version_code')
  const iosEq = parseVersionCode(form.get('ios_eq_version_code'), 'ios_eq_version_code')

  if (androidMin != null && androidMax != null && androidMin > androidMax) {
    throw new UploadError(422, 'The android_min_version_code must be less than or equal to android_max_version_code.')
  }
  if (iosMin != null && iosMax != null && iosMin > iosMax) {
    throw new UploadError(422, 'The ios_min_version_code must be less than or equal to ios_max_version_code.')
  }

  // Channel: CLI sends a name ("channel"), admin UI sends an id ("channel_id").
  // Both scoped to the app. For the name path (CLI), auto-create the channel if it
  // doesn't exist yet — otherwise a valid-looking upload silently lands on channel_id
  // null and the OTA endpoints can never serve it (see docs/05-cli-integration.md).
  let channelId: number | null = null
  const channelName = form.get('channel')
  const rawChannelId = form.get('channel_id')
  if (typeof channelName === 'string' && channelName !== '') {
    channelId = await resolveOrCreateChannelByName(db, application.id, channelName)
  } else if (typeof rawChannelId === 'string' && rawChannelId !== '') {
    const [channel] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.id, Number(rawChannelId)), eq(channels.applicationId, application.id)))
      .limit(1)
    if (!channel) {
      throw new UploadError(422, 'The selected channel is invalid.')
    }
    channelId = channel.id
  }

  const uuid = crypto.randomUUID()
  const filePath = `bundles/${uuid}.zip`
  await r2.put(filePath, await file.arrayBuffer())

  const nameField = form.get('name')
  const descField = form.get('description')
  const nowIso = new Date().toISOString()

  const [created] = await db
    .insert(bundles)
    .values({
      uuid,
      name: typeof nameField === 'string' && nameField !== '' ? nameField : file.name,
      description: typeof descField === 'string' && descField !== '' ? descField : null,
      size: file.size,
      filePath,
      applicationId: application.id,
      channelId,
      androidMinVersionCode: androidMin,
      androidMaxVersionCode: androidMax,
      androidEqVersionCode: androidEq,
      iosMinVersionCode: iosMin,
      iosMaxVersionCode: iosMax,
      iosEqVersionCode: iosEq,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .returning()

  await pruneBundles(db, r2, application.id, application.bundleLimit)
  return created!
}
