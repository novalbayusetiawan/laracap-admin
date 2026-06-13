---
title: Business Rules and Quirks
status: specification
audience: [ai-agent, developer]
depends_on: [03-api-contract, 04-ota-protocol]
blocks: [implementation]
compatibility: strict
---

# Business Rules and Quirks

Critical rules to preserve for API compatibility, plus known bugs to fix in the Nuxt rebuild.

## Bundle Retention

Two mechanisms operate together:

### 1. Pre-upload gate (`BundleController`)

Before creating a bundle:

```php
if ($application->bundles()->count() >= $application->bundle_limit) {
    return 403 'You have reached the maximum number of bundles...';
}
```

**Bug:** When `bundle_limit` is `null`, PHP treats `null >= N` as false for count comparison in some cases but `null` coerces to `0` in `>=` — can block all uploads when limit unset.

**Nuxt fix:**

```typescript
if (application.bundle_limit != null && count >= application.bundle_limit) {
  throw forbidden(...)
}
```

### 2. Post-upload prune (`BundleObserver`)

After bundle created, if `bundle_limit` is **truthy** (non-null, non-zero):

1. Get IDs of newest N bundles by `created_at DESC`
2. Delete all other bundles for that application
3. Each delete triggers file removal from storage

Unlimited retention: `bundle_limit` null → no pruning.

## Channel Switching

See [04-ota-protocol.md](./04-ota-protocol.md).

**Rule:** Compare per-channel bundle ID, not global active bundle ID.

```
channelBundleId = channel_bundle_id ?? X-Channel-Bundle-Id ?? X-Bundle-Id
is_update_available = latest exists AND (!channelBundleId OR latest.id !== channelBundleId)
```

**Intentional:** String cast comparison supports rollbacks (downgrade detection).

## Native Version Constraints

### Truth table

| Bundle state | Platform | Version header | Result |
|--------------|----------|----------------|--------|
| All 6 fields null | any | missing | Compatible |
| All 6 fields null | any | present | Compatible |
| Any field set | web | any | Compatible (skip) |
| Any field set | ios/android | missing | **Incompatible** |
| min set | ios/android | value < min | Incompatible |
| max set | ios/android | value > max | Incompatible |
| eq set | ios/android | value === eq | Incompatible |
| Constrained | ios/android | within range, not eq | Compatible |

### Latest bundle selection

Walk channel bundles `created_at DESC`, return **first compatible**.

Allows older bundle to serve devices excluded from newest upload (e.g. eq exclusion on latest).

### eq semantics

`eq` = **exclude** devices matching exact native build — not "equal to receive."

Use case: native build already contains fix; skip OTA for that build number.

## Channel Validation Quirk

Upload validation:

```php
'channel' => 'nullable|exists:channels,name',
```

Validates channel name **globally**, not scoped to application.

Resolution:

```php
Channel::where('name', $request->channel)
    ->where('application_id', $applicationId)
    ->value('id');
```

Wrong channel name for app → passes validation but `channel_id = null`.

**Nuxt fix (optional v2):** Scope validation to application. **v1 compat:** replicate current behavior.

## Authorization Rules

| Action | Rule |
|--------|------|
| Upload bundle | User must own application |
| List applications API | User's applications only |
| Admin view all | `is_admin = true` |
| User management | Admin only |
| OTA check/download | Public, no auth |
| Sync update | Admin only |

No Laravel Policies — all inline.

## File Storage Rules

| Event | Action |
|-------|--------|
| Bundle upload | Store to `bundles/{hash}` on public disk / R2 |
| Bundle delete | Remove file from storage |
| Filament upload max | 10 MB |
| No MIME restriction | Any file type accepted |

## Token Rules

| Rule | Detail |
|------|--------|
| API login token name | `api-token` |
| Filament token abilities | `['*']` |
| plain_text_token | Stored in DB (security debt) |
| Logout | Deletes current token only |
| Expiration | Per-token `expires_at`; null = never |

## Intentional Behaviors to Preserve

1. **Snake_case JSON** — raw model serialization, no transformers
2. **Application route key** — UUID in public URLs
3. **CLI application_id** — accepts numeric id OR uuid
4. **Download headers** — `X-Bundle-Id`, `X-Bundle-Uuid` required
5. **404 download message** — exact string `"No bundle found"`
6. **403 upload messages** — exact strings documented in API contract
7. **Inequality update check** — not semver/greater-than comparison

## Known Bugs — Do Not Replicate

| Bug | Location | Fix in Nuxt |
|-----|----------|-------------|
| bundle_limit null blocks upload | BundleController | Null-safe limit check |
| plain_text_token in DB | Sanctum + Filament | Show-once pattern |
| UserResource afterCreate tenant attach | CreateUser page | Remove |
| Admin app dropdown scoped to self | Bundle/Channel forms | Allow admin to pick any app |
| StatsOverview bundle sizes admin scope | Widget | Admin sees all storage |
| Orphan Application page classes | Filament pages | Use modal pattern only |
| Default CLI apiUrl includes /api | laracap-cli config | Document; don't fix server |
| application_user pivot unused | Migration | Skip unless RBAC built |
| is_admin migration empty down() | Migration | N/A |
| frontend_url config missing | config/app.php | Set in Nuxt env |

## Filament-Specific Quirks

| Quirk | Detail |
|-------|--------|
| Application CRUD | Modals on list, not dedicated routes |
| Device create | Disabled — API only |
| User edit | Modal on list, no edit route |
| ApiToken never_expires | Toggle not persisted — UI only |
| Bundle size | Computed from filesystem on create/edit |

## Edge Cases for Testing

1. Device on staging checks production channel — no false update
2. Server rollback to older bundle ID — update detected
3. Newest bundle incompatible — fallback to older compatible
4. Unconstrained bundle — no version header required
5. Constrained bundle — missing header → no update
6. eq exclusion — exact native build skipped
7. Retention at limit 2 — oldest pruned on third upload
8. Upload to wrong channel name — bundle created with null channel_id
