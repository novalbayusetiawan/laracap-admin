import { defineConfig } from 'vitest/config'

// Pure domain + serialization tests run on the standard Node pool — no bindings needed.
// Binding-backed integration tests (D1/R2/KV) live under test/integration and use the
// Workers pool via vitest.workers.config.ts once that pool API stabilises.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/integration/**'],
  },
})
