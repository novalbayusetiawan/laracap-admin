import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from './schema'

export type Database = DrizzleD1Database<typeof schema>

/**
 * Returns a Drizzle client bound to the request's D1 instance.
 * On Cloudflare, bindings live on `event.context.cloudflare.env`.
 */
export function useDatabase(event: H3Event): Database {
  const env = event.context.cloudflare?.env as { DB?: D1Database } | undefined
  const db = env?.DB
  if (!db) {
    throw createError({ statusCode: 500, statusMessage: 'D1 binding "DB" not available' })
  }
  return drizzle(db, { schema })
}

export { schema }
