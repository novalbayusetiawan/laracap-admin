# ADR 004: VPS / aaPanel Backend Portability

| | |
|---|---|
| **Status** | Accepted (deferred implementation) |
| **Date** | 2026-07-26 |
| **Context** | LaraCap runs on Cloudflare Workers (free tier). The architecture should support an optional self-hosted VPS backend (aaPanel + PM2 + Nginx) for users who hit CF limits or want full control. |
| **Decision** | Keep Cloudflare as the primary deployment target; design a thin adapter layer so the VPS port is a contained refactor, not a rewrite. Implement only when limits are actually hit or a self-host option is explicitly requested. |

## Motivation

Cloudflare's free tier is generous but bounded:

- 100K Worker requests/day, 5M D1 reads/day, 10GB R2 storage, 10ms CPU/request
- For a solo OTA server with a handful of apps and a normal device fleet, these are rarely hit
- A VPS (~$3–5/mo on Hetzner/Vultr/Contabo; or local Indonesian providers like Niagahoster/IDwebhost) removes all per-request ceilings and gives unlimited storage (disk-bound)
- aaPanel provides a free GUI for PM2, Nginx, MySQL/MariaDB, Redis, SSL via Let's Encrypt

The trade-off is operational: the VPS owner takes on patching, security, backups, SSL renewal, and uptime monitoring — all of which Cloudflare handles for free. This port is therefore **opt-in**, not the default.

## What's Cloudflare-locked (the coupling surface)

| CF binding / API | Used for | VPS replacement |
|---|---|---|
| `workerd` runtime (Nitro `cloudflare_module` preset) | Entire server | Nitro `node-server` preset → PM2 process behind Nginx reverse proxy |
| **D1** (`env.DB` binding) | All data via `drizzle-orm/d1` | SQLite file on disk (`better-sqlite3`) or MySQL/MariaDB (Drizzle generates both dialects) |
| **R2** (`env.BUNDLES` binding) | Bundle ZIP storage | Local filesystem (`/www/wwwroot/laracap/bundles/`) or MinIO for S3-compat |
| **KV** (`env.CACHE` binding) | Geo-IP cache for device tracking | In-memory `Map`, Redis (aaPanel-installable), or simply dropped — it's a cache, not a data store |
| `event.waitUntil()` | Async device tracking after response | Normal async (fire-and-forget) or BullMQ + Redis if true queue semantics are wanted |
| `wrangler.jsonc` | Build + deploy config + bindings | Deleted; aaPanel PM2 + Nginx config takes over |
| `crypto.randomUUID()` | UUID generation | Available in Node 22 (global) — no change |

## What's already portable

- **Drizzle ORM** — `better-sqlite3` adapter is already used in integration tests (`test/integration/`). Swapping D1→SQLite file is a `useDatabase()` change. Swapping to MySQL is a Drizzle dialect swap (regenerate migrations with `drizzle-kit generate --dialect mysql`).
- **Domain logic** — version constraints, serializers, bundle resolution: pure functions, zero runtime deps.
- **Frozen API contract** — `laracap-cli`, Capacitor apps, and OTA endpoints don't care what runtime serves them. All `/api/...` paths stay identical.
- **Vue/Nuxt admin UI** — framework-agnostic; runs anywhere Nitro runs.
- **Auth** — `nuxt-auth-utils` sealed cookies work on any runtime. `bcryptjs` is pure JS.

The refactor surface is small: **1 file (`useDatabase`) + 1 service (bundle storage path) + 1 Nitro preset + delete wrangler config.**

## Implementation plan (when triggered)

### Phase 1 — Adapter layer (the actual code change)

1. **Environment detection.** Add `server/utils/runtime.ts`:
   ```ts
   export const isCloudflare = typeof caches !== 'undefined' && typeof (globalThis as any).crypto?.subtle !== 'undefined'
   // Or simpler: check process.env.DEPLOY_TARGET === 'vps'
   ```
   A single `DEPLOY_TARGET=vps` env var is cleaner and more explicit than runtime sniffing.

2. **Database adapter.** Refactor `server/database/client.ts`:
   - CF path (existing): `drizzle(env.DB, { schema })` — unchanged.
   - VPS path: `drizzle(new Database('/path/to/laracap.db'), { schema })` via `better-sqlite3`.
   - MySQL option: `drizzle(mysql({ host, ... }), { schema })` — requires regenerating migrations for MySQL dialect.
   - Decision: **SQLite file** is the simplest, zero-infra VPS option. MySQL is only worth it if the VPS will host other apps sharing the DB. Default to SQLite for parity with D1.

3. **Storage adapter.** Refactor `server/services/bundle-upload.ts`:
   - Extract a `BundleStorage` interface: `put(key, buffer)`, `get(key)`, `delete(key)`, `size(key)`.
   - CF impl: wraps `env.BUNDLES` (R2).
   - VPS impl: wraps `fs.promises` writing to a configurable `BUNDLE_STORAGE_DIR`.
   - Inject via `event.context` or a factory keyed on `DEPLOY_TARGET`.

4. **Geo-IP cache.** `server/services/device-tracking.ts`:
   - CF path (existing): `env.CACHE.get/set` (KV).
   - VPS path: in-memory `Map` with TTL, or Redis client if `REDIS_URL` is set.
   - The cache is optional; a no-op impl is fine (just re-fetches geo on each check-in).

5. **`waitUntil`.** Replace `event.waitUntil(promise)` with:
   ```ts
   if (isCloudflare) event.waitUntil(promise)
   else void promise // fire-and-forget on Node
   ```
   Or, for reliability on VPS, use BullMQ + Redis if queue semantics are wanted. For v1, fire-and-forget is fine — device tracking is best-effort.

6. **Nitro preset.** Add a second Nitro config or use an env var:
   - `NITRO_PRESET=cloudflare_module` (existing) → builds for Workers.
   - `NITRO_PRESET=node-server` → builds a standalone Node server (`node .output/server/index.mjs`).
   - No code changes needed — Nitro already supports both presets.

### Phase 2 — aaPanel provisioning

1. **Node.js** — install via aaPanel App Store (Node 22+).
2. **PM2** — manage the Node process: `pm2 start .output/server/index.mjs --name laracap`.
3. **Nginx** — reverse proxy to `localhost:3000` (or whatever port); aaPanel auto-generates the site config + SSL via Let's Encrypt.
4. **SQLite** — zero install; `better-sqlite3` ships as a native addon (already in devDeps). The DB file lives at `/www/wwwroot/laracap/data/laracap.db`.
5. **Bundle storage** — `/www/wwwroot/laracap/bundles/` with Nginx serving the download endpoint directly (optional optimization), or let Nitro stream it.
6. **Env vars** — set in PM2 ecosystem config or aaPanel's env manager:
   - `DEPLOY_TARGET=vps`
   - `BUNDLE_STORAGE_DIR=/www/wwwroot/laracap/bundles`
   - `DATABASE_URL=file:/www/wwwroot/laracap/data/laracap.db` (or omit if using a hardcoded path)
   - `NUXT_SESSION_PASSWORD=...` (same as CF secret)
   - `NUXT_PUBLIC_APP_URL=https://laracap.yourdomain.com`

### Phase 3 — CI/CD (optional)

- CF path: existing GitHub Actions `deploy.yml` (wrangler deploy).
- VPS path: GitHub Actions SSH deploy, or aaPanel's built-in Git deploy (pull → install → build → `pm2 reload`).
- Both can coexist; the repo doesn't need to choose.

## What does NOT change

- The frozen API contract (`docs/03-api-contract.md`) — identical on both backends.
- `laracap-cli` — works against either server URL; no CLI changes.
- Admin UI — identical Vue components; Nitro serves them on both runtimes.
- Auth model — sealed cookies + Sanctum-compatible bearer tokens; runtime-agnostic.
- Database schema — identical (SQLite-compatible on both). For MySQL, regenerate migrations but the Drizzle schema definitions stay the same.

## Migration path (CF → VPS)

1. Export D1 data: `wrangler d1 export laracap-db --remote --output=dump.sql`
2. Import to VPS SQLite: `sqlite3 laracap.db < dump.sql` (D1's SQL is SQLite-compatible)
3. Copy R2 bundles: download each bundle ZIP, upload to VPS disk (or `rclone`/`wrangler r2 object get` in a loop)
4. Point DNS to the VPS (or keep CF as a proxy in front — Cloudflare's CDN + DDoS protection can sit in front of a VPS origin for free)
5. Update `laracap-cli --server` to the new URL

## Cost comparison

| | Cloudflare Free | VPS (aaPanel) |
|---|---|---|
| Requests | 100K/day | Unlimited |
| Storage | 10GB R2 | Disk-bound (unlimited) |
| DB reads | 5M D1 reads/day | Unlimited |
| CPU | 10ms/request | Unlimited |
| DDoS / SSL / Patching | Free, automatic | You manage |
| Monthly cost | $0 | $3–5 (VPS) |
| Ops burden | None | Patching, backups, monitoring |

## Decision: when to implement

Do NOT implement now. The current CF free-tier usage is well within limits. Implement when:

- Worker request count consistently exceeds 100K/day, **or**
- D1 read count consistently exceeds 5M/day, **or**
- R2 storage exceeds 10GB, **or**
- A self-hosted deployment is explicitly requested (client preference, data sovereignty, etc.)

The adapter layer is designed; the implementation is estimated at **one focused session** (~2–3 hours) given the small coupling surface. No spec changes, no CLI changes, no UI changes — pure infrastructure.

## Related

- [13-implementation-status.md](../13-implementation-status.md) — current CF-only implementation
- ADR 001 — Cloudflare as the deployment target (this ADR extends, not replaces, that decision)
- `docs/03-api-contract.md` — the frozen contract both backends serve
