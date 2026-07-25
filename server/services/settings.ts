import { eq } from 'drizzle-orm'
import type { Database } from '../database/client'
import { settings } from '../database/schema'

/**
 * App settings service (key-value, JSON values).
 * Defaults live here so a missing row behaves sensibly.
 */

const DEFAULTS = {
  registration_enabled: true,
} satisfies Record<string, unknown>

export type SettingKey = keyof typeof DEFAULTS

export async function getSetting<K extends SettingKey>(db: Database, key: K): Promise<(typeof DEFAULTS)[K]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1)
  if (!row) return DEFAULTS[key]
  try {
    return JSON.parse(row.value)
  } catch {
    return DEFAULTS[key]
  }
}

export async function setSetting<K extends SettingKey>(db: Database, key: K, value: (typeof DEFAULTS)[K]): Promise<void> {
  const nowIso = new Date().toISOString()
  await db
    .insert(settings)
    .values({ key, value: JSON.stringify(value), updatedAt: nowIso })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value), updatedAt: nowIso } })
}

export async function getAllSettings(db: Database): Promise<typeof DEFAULTS> {
  const rows = await db.select().from(settings)
  const out = { ...DEFAULTS }
  for (const row of rows) {
    if (row.key in out) {
      try {
        ;(out as Record<string, unknown>)[row.key] = JSON.parse(row.value)
      } catch { /* keep default */ }
    }
  }
  return out
}
