import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../database/client'
import { applications, bundles, channels, type Application, type Bundle } from '../database/schema'
import { findLatestCompatibleBundle, type Platform } from '../domain/version-constraints'

/**
 * Bundle resolution service — the shared query path behind both OTA endpoints
 * (docs/03-api-contract.md, docs/04-ota-protocol.md). Keeps handlers thin and the
 * compatibility algorithm in one place.
 */

export async function findApplicationByUuid(
  db: Database,
  uuid: string,
): Promise<Application | null> {
  const [row] = await db.select().from(applications).where(eq(applications.uuid, uuid)).limit(1)
  return row ?? null
}

export async function findBundleById(db: Database, id: number): Promise<Bundle | null> {
  const [row] = await db.select().from(bundles).where(eq(bundles.id, id)).limit(1)
  return row ?? null
}

/**
 * Resolve the latest compatible bundle for an application's channel (by name).
 * Returns null when the channel does not exist or no bundle is compatible.
 * Bundles are fetched newest-first so the domain walk can short-circuit.
 */
export async function resolveLatestCompatibleBundle(
  db: Database,
  application: Application,
  channelName: string,
  platform: Platform,
  versionCode: number | null,
): Promise<Bundle | null> {
  const [channel] = await db
    .select()
    .from(channels)
    .where(and(eq(channels.applicationId, application.id), eq(channels.name, channelName)))
    .limit(1)

  if (!channel) return null

  const channelBundles = await db
    .select()
    .from(bundles)
    .where(eq(bundles.channelId, channel.id))
    .orderBy(desc(bundles.createdAt), desc(bundles.id))

  return findLatestCompatibleBundle(channelBundles, platform, versionCode)
}
