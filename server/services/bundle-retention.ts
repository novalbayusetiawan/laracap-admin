import { and, desc, eq, notInArray } from 'drizzle-orm'
import type { Database } from '../database/client'
import { bundles } from '../database/schema'

/**
 * Bundle retention (docs/12-business-rules-and-quirks.md).
 *
 * Post-upload prune: when bundle_limit is truthy (non-null, non-zero), keep the newest N
 * bundles for the application and delete the rest (also removing their R2 objects).
 * Unlimited retention (null limit) → no-op.
 */
export async function pruneBundles(
  db: Database,
  r2: R2Bucket | undefined,
  applicationId: number,
  bundleLimit: number | null,
): Promise<void> {
  if (!bundleLimit || bundleLimit <= 0) return

  const keep = await db
    .select({ id: bundles.id })
    .from(bundles)
    .where(eq(bundles.applicationId, applicationId))
    .orderBy(desc(bundles.createdAt), desc(bundles.id))
    .limit(bundleLimit)

  const keepIds = keep.map((b) => b.id)
  if (keepIds.length < bundleLimit) return // not over the limit yet

  const stale = await db
    .select({ id: bundles.id, filePath: bundles.filePath })
    .from(bundles)
    .where(and(eq(bundles.applicationId, applicationId), notInArray(bundles.id, keepIds)))

  if (stale.length === 0) return

  await db.delete(bundles).where(
    and(eq(bundles.applicationId, applicationId), notInArray(bundles.id, keepIds)),
  )

  if (r2) {
    await Promise.all(stale.map((b) => r2.delete(b.filePath).catch(() => {})))
  }
}
