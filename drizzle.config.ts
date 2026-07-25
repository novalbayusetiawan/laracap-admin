import { defineConfig } from 'drizzle-kit'

// D1 is SQLite-compatible. Migrations are emitted to server/database/migrations
// and applied with `wrangler d1 migrations apply`.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'd1-http',
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
})
