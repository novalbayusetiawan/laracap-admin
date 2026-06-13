---
title: Migration from Laravel
status: specification
audience: [ai-agent, developer]
depends_on: [02-data-model, 09-cloudflare-architecture]
blocks: [deployment]
compatibility: n/a
---

# Migration from Laravel

Guide for operators migrating from **laracap-live-update** (Laravel) to **laracap-admin** (Nuxt on Cloudflare).

## Pre-Migration Checklist

- [ ] Export Laravel database (SQLite dump or mysqldump)
- [ ] Copy bundle files from `storage/app/public/bundles/`
- [ ] Document `APP_URL` for DNS cutover
- [ ] Notify users to re-create API tokens (if not migrating plain tokens)
- [ ] Update CI `laracap-cli --server` URL if domain changes

## Step 1: D1 Schema

Apply schema from [02-data-model.md](./02-data-model.md) via Drizzle migrations:

```bash
wrangler d1 migrations apply laracap --remote
```

Tables to migrate (domain):

- users, applications, channels, bundles, devices, device_logs, personal_access_tokens
- sessions, password_reset_tokens (for session auth)

Skip or defer: `application_user` (unused pivot).

## Step 2: Data Migration

### Users

Migrate with bcrypt password hashes intact — no password reset required.

```sql
INSERT INTO users (id, name, email, email_verified_at, password, is_admin, ...)
SELECT id, name, email, email_verified_at, password, is_admin, ...
FROM laravel_users;
```

### Applications, channels, bundles

Preserve:
- Numeric `id` (CLI references)
- `uuid` (OTA URLs)
- All version constraint columns
- `file_path` values (map to R2 keys)

### Devices and device_logs

Full copy recommended for dashboard continuity.

### API tokens

**Option A (secure):** Force token regeneration — users re-login via CLI and recreate admin tokens.

**Option B (compat):** Migrate hashed `token` column; plain tokens unavailable unless `plain_text_token` was stored.

## Step 3: Bundle Files → R2

```bash
# Example: sync local bundles to R2
for f in storage/app/public/bundles/*; do
  wrangler r2 object put laracap-bundles/bundles/$(basename $f) --file=$f
done
```

Preserve `file_path` column values matching R2 keys (e.g. `bundles/abc123.zip`).

## Step 4: Environment Mapping

| Laravel `.env` | Nuxt / Cloudflare |
|----------------|-------------------|
| `APP_URL` | `NUXT_PUBLIC_APP_URL` |
| `APP_KEY` | Session encryption secret |
| `FRONTEND_URL` | CORS allowed origin |
| `DB_*` | D1 binding (no env needed on Workers) |
| `FILESYSTEM_DISK` | R2 binding |
| `QUEUE_CONNECTION` | Queues binding |
| `CACHE_STORE` | KV binding |

## Step 5: DNS Cutover

Point domain to Cloudflare Pages/Workers. Same hostname preserves:

- cap-update `sync({ url })` URLs in deployed apps
- laracap-cli stored server URL

No app update needed if URL unchanged.

## Step 6: Decommission Laravel

After validation:

- Stop Laravel queue workers
- Archive `storage/app/public/bundles/`
- Retire Filament admin (admin now at same `/admin` on Nuxt)

## Laravel → Nuxt File Mapping

| Laravel | Nuxt target |
|---------|-------------|
| `routes/api.php` | `server/api/**/*.ts` |
| `LatestAppBundleController` | `server/api/applications/[uuid]/bundles/latest.get.ts` |
| `LatestAppBundleDownloadController` | `server/api/applications/[uuid]/bundles/latest/download.get.ts` |
| `BundleController` | `server/api/bundles.post.ts` |
| `AuthTokenController` | `server/api/login.post.ts`, `logout.delete.ts` |
| `ApplicationController` | `server/api/applications.get.ts` |
| `app/Models/*` | `server/database/schema.ts` |
| `NativeVersionConstraintService` | `server/utils/nativeVersionConstraints.ts` |
| `TrackDeviceJob` | Queue consumer / `server/tasks/deviceTrack.ts` |
| `BundleObserver` | `server/utils/bundleRetention.ts` |
| `app/Filament/Resources/*` | `app/pages/admin/**/*.vue` |
| `app/Filament/Widgets/*` | `app/components/admin/dashboard/*.vue` |
| `AdminPanelProvider` | `nuxt.config.ts`, auth middleware |
| `routes/auth.php` | `server/api/auth/*.ts` + admin pages |
| `storage/app/public/bundles/` | R2 bucket |
| `GET /admin/sync-update` | Cloudflare Pages auto-deploy |

## Behavioral Fixes During Migration

Implement these fixes in Nuxt (documented in [12-business-rules-and-quirks.md](./12-business-rules-and-quirks.md)):

| Fix | Reason |
|-----|--------|
| Null-safe `bundle_limit` check | Prevent blocking uploads when unlimited |
| Token show-once | Security improvement |
| Admin app dropdown for admins | Allow managing all users' apps |

**Do not fix** without v2 API:

- Channel global exists validation
- String inequality update comparison

## Validation After Migration

Run equivalent of legacy Pest tests — see [11-test-matrix.md](./11-test-matrix.md).

Manual checks:

1. `laracap-cli apps:bundles:create` upload succeeds
2. cap-update `sync()` downloads and applies bundle
3. Admin login, bundle upload, token create/revoke
4. Dashboard widgets show data
5. Device check-in creates device_logs (with queue running)

## Rollback Plan

Keep Laravel instance running until Nuxt validated. DNS TTL lowering before cutover enables quick rollback.
