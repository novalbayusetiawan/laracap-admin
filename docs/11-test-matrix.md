---
title: Test Matrix
status: specification
audience: [ai-agent, developer]
depends_on: [03-api-contract, 12-business-rules-and-quirks]
blocks: [qa, implementation]
compatibility: strict
---

# Test Matrix

Behavioral test requirements for the Nuxt rebuild, mapped from legacy Pest tests in `laracap-live-update/tests/`.

## Test Framework

| Legacy | Nuxt target |
|--------|-------------|
| Pest 3 + PHPUnit 11 | Vitest + `@cloudflare/vitest-pool-workers` |
| `RefreshDatabase` | D1 test database reset per test |
| `Storage::fake('public')` | Mock R2 binding |

## PHPUnit Environment Overrides

```xml
QUEUE_CONNECTION=sync
SESSION_DRIVER=array
CACHE_STORE=array
```

Replicate in Vitest setup for deterministic async behavior.

---

## P0 — Must Pass Before Release

### NativeVersionConstraintTest

**File:** `tests/Feature/NativeVersionConstraintTest.php`  
**Setup:** `Storage::fake('public')`, helper creates Application + Channel `production`

| Test | Assert |
|------|--------|
| unconstrained without version header | GET latest → 200, `is_update_available=true`, bundle returned |
| android min/max (dataset: 9, 11, 13) | With min=10 max=12: 9→false, 11→true, 13→false |
| android eq exclusion (dataset: 10, 11) | With min=10 max=12 eq=11: 11→false, 10→true |
| missing header + constrained | min=10 only → `is_update_available=false`, `latest_bundle=null` |
| fallback to older unconstrained | Newer min=20 incompatible; older unconstrained (-1hr) served for version 11 |
| download 404 no compatible | min=20 only, version 11 → download 404 |
| stores constraints on upload | POST bundle with all 6 fields → 200, JSON contains all fields |
| validates min ≤ max | min=20 max=10 → 422 on `android_min_version_code` |
| ios constraints independent | ios min=100 max=200, platform ios, version 150 → update available |

**Headers used:** `X-Device-Identifier`, `X-Platform`, `X-Channel`, `X-App-Version-Code`

### LatestAppBundleControllerTest

**File:** `tests/Feature/LatestAppBundleControllerTest.php`

| Test | Assert |
|------|--------|
| per-channel bundle id logic | Prod + staging channels; device on staging id, check prod with global staging id → update available to prod |
| | Same with `X-Channel-Bundle-Id=prod` → no update |

---

## P1 — Should Pass

### BundleObserverTest

**File:** `tests/Feature/BundleObserverTest.php`

| Test | Assert |
|------|--------|
| prunes old bundles | `bundle_limit=2`, create 3 bundles → oldest deleted, middle + newest remain |

### ApiTokensTest

**File:** `tests/Feature/ApiTokensTest.php`  
**Note:** Filament Livewire — adapt to Nuxt admin API or E2E

| Test | Assert |
|------|--------|
| render api tokens page | Authenticated user sees tokens page |
| create never-expires token | Token created, `expires_at` null |
| create expiring token | Token created, `expires_at` matches +30 days |
| revoke token | Delete action → 0 tokens remain |

### Auth Tests

**Files:** `tests/Feature/Auth/*.php`

| File | Assert |
|------|--------|
| AuthenticationTest | POST `/login` valid → authenticated, 204; invalid → guest; logout → guest |
| RegistrationTest | POST `/register` → authenticated, 204 |
| PasswordResetTest | forgot-password sends notification; reset with token → 200 |
| EmailVerificationTest | valid signed URL → verified; invalid hash → not verified |

---

## Placeholder Tests (Low Priority)

| File | Assert |
|------|--------|
| ExampleTest (Feature) | GET `/` → 200 |
| ExampleTest (Unit) | `true` is true |

---

## Gaps — Add in Nuxt Rebuild

Not covered by legacy tests; **must add**:

| Behavior | Priority | Suggested test |
|----------|----------|----------------|
| POST `/api/login` success/failure | P0 | Returns `{ token }` / 401 message |
| DELETE `/api/logout` | P0 | 204, token invalidated |
| GET `/api/applications` | P1 | Returns only owned apps |
| Upload 403 wrong owner | P0 | Exact error message |
| Upload 403 bundle_limit | P0 | Exact error message |
| Upload bundle_limit null | P0 | Should NOT block (fix + test) |
| Download 200 + headers | P0 | `X-Bundle-Id`, `X-Bundle-Uuid` present |
| Device tracking job | P1 | Device + DeviceLog created on check |
| Admin tenancy scoping | P1 | Non-admin cannot see other user's apps |
| application_id as UUID upload | P1 | CLI compat |
| Channel name wrong for app | P2 | channel_id null, upload succeeds |

---

## Test Data Conventions

From factories:

| Factory | Default password | Notes |
|---------|------------------|-------|
| UserFactory | `password` | Use for login tests |
| ApplicationFactory | nested User | Override user_id in multi-tenant tests |
| BundleFactory | — | **Always override** application_id + channel_id to same app |

Helper pattern from NativeVersionConstraintTest:

```typescript
async function createVersionTestContext() {
  const user = await createUser()
  const app = await createApplication({ user_id: user.id })
  const channel = await createChannel({ application_id: app.id, name: 'production' })
  return { user, app, channel }
}
```

---

## CI Integration Test

End-to-end smoke test with real CLI (optional nightly):

```bash
npx laracap apps:bundles:create \
  --path ./fixtures/dist \
  --server $TEST_SERVER \
  --token $TEST_TOKEN \
  --app-id $TEST_APP_ID \
  --channel production
```

---

## Compatibility Verification Checklist

Before release, manually verify:

- [ ] cap-update example-app `sync()` against Nuxt server
- [ ] laracap-cli upload from CI workflow
- [ ] Admin bundle upload with version constraints
- [ ] Token create + CLI auth with new token
- [ ] Channel switch scenario (staging → production)
- [ ] Rollback scenario (deploy older bundle, device updates)

---

## Priority Summary

| Priority | Count | Blocks release |
|----------|-------|----------------|
| P0 | ~15 tests | Yes |
| P1 | ~12 tests | Recommended |
| P2 | ~3 tests | No |
