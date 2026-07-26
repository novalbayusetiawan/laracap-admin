import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import * as schema from '../../server/database/schema'
import { createBundle, resolveOrCreateChannelByName } from '../../server/services/bundle-upload'
import { resolveLatestCompatibleBundle } from '../../server/services/bundles'

/**
 * Integration tests: real Drizzle queries against an in-memory SQLite DB with the
 * production migration applied, plus an in-memory R2 stub. These exercise the actual
 * service code paths (channel auto-create, bundle insert, OTA resolution) end to end —
 * the layer the pure unit tests can't reach.
 */

type Db = ReturnType<typeof drizzle<typeof schema>>

/** Minimal R2Bucket stub: enough of the API for createBundle + downloads. */
function makeR2() {
  const store = new Map<string, ArrayBuffer>()
  return {
    store,
    async put(key: string, value: ArrayBuffer) {
      store.set(key, value)
      return { key }
    },
    async get(key: string) {
      const v = store.get(key)
      return v ? { body: v, async arrayBuffer() { return v } } : null
    },
    async delete(key: string) {
      store.delete(key)
    },
  } as unknown as R2Bucket
}

function makeForm(fields: Record<string, string>, file?: File): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  if (file) fd.set('file', file)
  return fd
}

let db: Db
let r2: ReturnType<typeof makeR2>
let sqlite: Database.Database

beforeEach(async () => {
  sqlite = new Database(':memory:')
  const initSql = readFileSync(join(__dirname, '../../server/database/migrations/0000_init.sql'), 'utf8')
  const settingsSql = readFileSync(join(__dirname, '../../server/database/migrations/0001_settings_superadmin.sql'), 'utf8')
  // Drizzle migration files use `--> statement-breakpoint` between statements.
  for (const chunk of `${initSql}\n${settingsSql}`.split('--> statement-breakpoint')) {
    const stmt = chunk.replace(/^\s*-->.*$/gm, '').trim()
    if (stmt) sqlite.exec(stmt)
  }
  db = drizzle(sqlite, { schema })
  r2 = makeR2()

  const now = '2026-01-01 00:00:00'
  await db.insert(schema.users).values({ id: 1, name: 'Owner', email: 'owner@test.dev', password: 'x', isAdmin: true, isSuperadmin: true, createdAt: now, updatedAt: now })
  await db.insert(schema.applications).values({ id: 1, uuid: 'app-uuid-1', userId: 1, name: 'Test App', slug: 'test-app', bundleLimit: null, createdAt: now, updatedAt: now })
})

describe('resolveOrCreateChannelByName', () => {
  it('creates a channel when absent, returns its id', async () => {
    const before = await db.select().from(schema.channels)
    expect(before).toHaveLength(0)

    const id = await resolveOrCreateChannelByName(db, 1, 'production')
    const rows = await db.select().from(schema.channels)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.id).toBe(id)
    expect(rows[0]!.name).toBe('production')
    expect(rows[0]!.applicationId).toBe(1)
  })

  it('reuses an existing channel instead of duplicating', async () => {
    const first = await resolveOrCreateChannelByName(db, 1, 'production')
    const second = await resolveOrCreateChannelByName(db, 1, 'production')
    expect(second).toBe(first)
    expect(await db.select().from(schema.channels)).toHaveLength(1)
  })
})

describe('createBundle (CLI path) — channel auto-create regression', () => {
  it('auto-creates the channel and links the bundle (the bug we hit in prod)', async () => {
    const [app] = await db.select().from(schema.applications).where(eq(schema.applications.id, 1))
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'bundle.zip', { type: 'application/zip' })

    const created = await createBundle(db, r2 as unknown as R2Bucket, app!, {
      form: makeForm({ application_id: '1', channel: 'production', name: 'v1' }, file),
      file,
    })

    // Bundle is attached to a real channel (NOT null — that was the prod bug).
    expect(created.channelId).not.toBeNull()
    const [chan] = await db.select().from(schema.channels).where(eq(schema.channels.id, created.channelId!))
    expect(chan!.name).toBe('production')

    // File landed in R2 under the bundle path.
    expect(r2.store.has(created.filePath)).toBe(true)

    // And OTA resolution can now find it for that channel.
    const latest = await resolveLatestCompatibleBundle(db, app!, 'production', 'android', 1)
    expect(latest?.id).toBe(created.id)
  })

  it('rejects an invalid explicit channel_id (admin path)', async () => {
    const [app] = await db.select().from(schema.applications).where(eq(schema.applications.id, 1))
    const file = new File([new Uint8Array([1])], 'b.zip', { type: 'application/zip' })
    await expect(
      createBundle(db, r2 as unknown as R2Bucket, app!, {
        form: makeForm({ application_id: '1', channel_id: '999', name: 'v1' }, file),
        file,
      }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})
