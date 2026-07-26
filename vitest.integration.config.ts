import { defineConfig } from 'vitest/config'

// Integration tests: real Drizzle queries against in-memory SQLite (better-sqlite3)
// with the production migrations applied, plus an in-memory R2 stub. Standard Node pool.
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
  },
})
