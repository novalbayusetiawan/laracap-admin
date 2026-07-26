# Implementation Status

> **This document is the source of truth for what was actually built**, as of the
> Nuxt-4-on-Cloudflare rebuild. The rest of `docs/` is the original specification
> (derived from the Laravel + Filament system). Where the two disagree, **this file
> wins** — the spec docs describe intent and the legacy system; this file describes
> the shipped implementation and every deliberate deviation.

Live: **https://laracap.novals.dev** (Cloudflare Worker `laracap-admin`).

## Status at a glance

| Area | Spec ref | Status | Notes |
|------|----------|--------|-------|
| D1 schema + Drizzle | `02`, ADR 003 | ✅ Shipped | 10 tables; migrations `0000_init`, `0001_settings_superadmin` |
| Public OTA API (check + download) | `03`, `04` | ✅ Shipped | Streams ZIP from R2; never redirects to a public R2 URL |
| CLI API (login, tokens, upload) | `03`, `05` | ✅ Shipped | Verified live against `laracap-cli@1.0.4` |
| R2 bundle storage | ADR 002 | ✅ Shipped | Bucket `laracap-bundles` |
| Admin panel (7 resources) | `06` | ✅ Shipped | Dashboard, Applications, Bundles, Channels, Devices, Users, API Tokens |
| Dashboard charts | `06` | ✅ Shipped | Custom dependency-free SVG area charts (14-day activity + uploads) |
| Device tracking | `08` | ✅ Shipped | `ctx.waitUntil()` (NOT Queues) + KV geo cache |
| Auth + tenancy | `07` | ✅ Shipped | `nuxt-auth-utils` sealed cookies (NOT Lucia); bearer for CLI |
| Superadmin + settings + impersonation | — | ✅ Shipped (beyond spec) | See below |
| Custom domain | — | ✅ Shipped | `laracap.novals.dev` |
| CI/CD | — | ✅ Present | GitHub Actions (`.github/workflows/deploy.yml`); needs repo secrets |
| Pure unit tests | `11` | ✅ 25 passing | domain + serialization + contract shapes |
| Integration tests | `11` | ✅ 4 passing | in-memory SQLite + R2 stub; real service round-trips |
| Laravel data migration | `10` | ⏭️ Out of scope | User elected to skip (fresh install) |

## Key deviations from the spec docs

These are intentional. The spec docs still describe the Laravel-era approach in places;
this is what actually shipped.

### 1. Device tracking: `waitUntil()`, not Cloudflare Queues
`docs/08-device-tracking.md` and `docs/01-system-architecture.md` describe a
`TrackDeviceJob` on Cloudflare Queues (mirroring Laravel's queued job). **Queues are a
paid feature.** The implementation uses `event.waitUntil()` to run device tracking after
the response is sent — same "don't block the OTA response" outcome, free tier compatible.
Code: `server/services/device-tracking.ts`, called from both OTA endpoints.

### 2. Deployment: single Worker + Static Assets, not Pages
Spec mentions "Cloudflare Pages + Workers". Shipped as **one Worker** serving both the
Nitro server and the static client assets (Nitro `cloudflare_module` preset). Config in
`wrangler.jsonc`; build output under `.output`, deployed with `wrangler deploy --cwd .output`.

### 3. Auth: `nuxt-auth-utils`, not Lucia
Early planning referenced Lucia. Shipped with **`nuxt-auth-utils`** (sealed-cookie
sessions) for the admin panel and **Sanctum-compatible bearer tokens** for the CLI/OTA
API. `bcryptjs` for password hashing (Laravel hash compatibility preserved).
Code: `server/utils/session-auth.ts`, `server/utils/bearer-auth.ts`.

### 4. Superadmin / settings / impersonation (added beyond the original spec)
Not in the Laravel system; added at the user's request.
- **`users.is_superadmin`** column (migration `0001`). The **first user to register**
  auto-becomes admin + superadmin (bootstrap); you can never lock yourself out.
- **`settings`** key-value table gates **public registration** via a superadmin-only
  toggle at `/admin/settings/general`. First user bypasses the gate.
- **Impersonation**: superadmin assumes any user's session (`impersonatorId` retained in
  the session), with an amber banner and "stop impersonating" to restore. Superadmin
  powers are correctly dropped while impersonating.
- Server guards: `requireSuperadmin()` on `/api/admin/settings/*` and
  `/api/admin/impersonate/*`.

### 5. Channel auto-create on CLI upload
The frozen contract keeps `channel` optional, but a CLI upload with a `channel` name that
didn't exist previously stored `channel_id: null` **silently** — the bundle then could
never be served by the OTA endpoints (they resolve by channel). The upload service now
**auto-creates the channel by name** (scoped to the app) on the CLI path, and **rejects an
invalid explicit `channel_id`** (422) on the admin path. Because `(application_id, name)`
is intentionally non-unique (legacy quirk), resolution is select-then-insert.
Code: `resolveOrCreateChannelByName()` in `server/services/bundle-upload.ts`.
Regression test: `test/integration/bundle-upload.test.ts`.

### 6. `bundle_limit` null-safe retention gate
Legacy bug: a null `bundle_limit` blocked uploads. Fixed — retention is only enforced
when a limit is actually set. Code: `server/api/bundles.post.ts`.

## Testing

- `pnpm test` — pure unit tests (Node pool): domain version-constraint logic,
  serialization (UTC/Laravel timestamps), API contract shapes. **25 tests.**
- `pnpm test:integration` — real Drizzle queries against in-memory SQLite
  (`better-sqlite3`) with production migrations applied, plus an in-memory R2 stub;
  exercises channel auto-create, bundle insert, and OTA resolution end to end. **4 tests.**
- `pnpm test:all` — both suites.

The `@cloudflare/vitest-pool-workers` route was abandoned: the available prerelease
(0.18.8) is incompatible with vitest 4 (missing `defineWorkersConfig`). The in-memory
SQLite approach tests the same query paths without the workerd pool dependency.

## Known gaps / backlog

- Bundle detail/edit page and application detail view (minor admin polish).
- Charts are activity/upload counts only; no per-app drill-down yet.
- No automated test for the impersonation/session flow (verified manually + live).
- CI deploy job requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets.
