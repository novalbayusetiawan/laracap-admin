---
title: API Contract
status: specification
audience: [ai-agent, developer]
depends_on: [02-data-model]
blocks: [server/api implementation, cli-validation]
compatibility: strict
---

# API Contract

**Frozen contract** for cap-update v8.x and laracap-cli v1.x compatibility. All routes are prefixed `/api` unless noted.

Source: [laracap-live-update/routes/api.php](https://github.com/novalbayusetiawan/laracap-live-update/blob/main/routes/api.php)

## Route Summary

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/api/user` | Bearer | Current user |
| GET | `/api/applications/{application}/bundles/latest` | None | OTA check |
| GET | `/api/applications/{application}/bundles/latest/download` | None | OTA download |
| GET | `/api/applications` | Bearer | List user's apps |
| POST | `/api/bundles` | Bearer | Upload bundle |
| POST | `/api/login` | None | Get API token |
| DELETE | `/api/logout` | Bearer | Revoke token |

`{application}` resolves by **`uuid`** (not numeric id).

---

## Public: Check for Update

### `GET /api/applications/{uuid}/bundles/latest`

**Route name:** `latest-app-bundle`

#### Request inputs

Body/query parameters take precedence over headers.

| Param | Header fallback | Type | Required | Description |
|-------|-----------------|------|----------|-------------|
| `device_identifier` | `X-Device-Identifier` | string | No* | Device UUID |
| `platform` | `X-Platform` | string | No* | `ios`, `android`, `web` |
| `bundle_id` | `X-Bundle-Id` | int/string | No | Global active bundle ID |
| `channel` | `X-Channel` | string | No | Channel name (plugin default: `production`) |
| `channel_bundle_id` | `X-Channel-Bundle-Id` | int/string | No | Per-channel bundle ID; falls back to `bundle_id` |
| `app_version_code` | `X-App-Version-Code` | int/string | No | Native build number |

\*Both `device_identifier` and `platform` required together to trigger device tracking.

#### Logic (implement in this order)

1. **Resolve inputs** from body/query, then headers.
2. **Channel bundle ID chain:**
   ```
   channelBundleId = channel_bundle_id ?? X-Channel-Bundle-Id ?? bundle_id
   ```
3. **Device tracking** (if identifier + platform present):
   - Parse `bundle_id` as int if numeric; else null
   - If bundle_id set but no DB row exists → set to null
   - Dispatch async device tracking with `type = 'check'`
4. **Find channel:** `application.channels.where(name = channelName).first()`
5. **Find latest compatible bundle:**
   - If channel exists → `findLatestCompatibleBundle(channel, platform, versionCode)`
   - Else → null
   - Algorithm: get channel bundles ordered `created_at DESC`, return first where `isCompatibleWith(platform, versionCode)`
6. **Update availability:**
   ```javascript
   isUpdateAvailable = false
   if (latestBundle) {
     if (!channelBundleId || String(latestBundle.id) !== String(channelBundleId)) {
       isUpdateAvailable = true
     }
   }
   ```
   Uses **string comparison** — supports rollbacks and channel switches.
7. **Current bundle:** load by numeric `bundle_id` if valid, else null
8. **Download URL:** if `latestBundle` exists:
   ```
   /api/applications/{uuid}/bundles/latest/download?channel={channelName}
   ```
   (absolute URL via app base URL)

#### Response `200`

```json
{
  "is_update_available": true,
  "latest_bundle": { /* full Bundle object or null */ },
  "current_bundle": { /* full Bundle object or null */ },
  "download_url": "https://example.com/api/applications/{uuid}/bundles/latest/download?channel=production"
}
```

#### Errors

| Status | Condition |
|--------|-----------|
| 404 | Application UUID not found (model binding) |

---

## Public: Download Bundle

### `GET /api/applications/{uuid}/bundles/latest/download`

**Route name:** `latest-app-bundle-download`

#### Request inputs

| Param | Header fallback | Notes |
|-------|-----------------|-------|
| `device_identifier` | `X-Device-Identifier` | |
| `platform` | `X-Platform` | |
| `channel` | `X-Channel` | Also accepted as query param |
| `app_version_code` | `X-App-Version-Code` | |

No `bundle_id` or `channel_bundle_id` on download.

#### Logic

1. Resolve channel by name on application
2. Find latest compatible bundle (same as check endpoint)
3. If identifier + platform → track device with `type = 'download'`, bundle_id = latest bundle id
4. If no compatible bundle → **404**
5. Else stream ZIP file with headers:

| Header | Value |
|--------|-------|
| `X-Bundle-Id` | Numeric bundle id |
| `X-Bundle-Uuid` | Bundle uuid string |

#### Response `200`

Binary ZIP file stream (Content-Disposition attachment).

#### Response `404`

```json
{
  "message": "No bundle found"
}
```

---

## Authenticated: Login

### `POST /api/login`

**Route name:** `login` (collides with web route name — use full path `/api/login`)

#### Request

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

#### Validation

| Field | Rules |
|-------|-------|
| email | required, email |
| password | required |

#### Response `200`

```json
{
  "token": "plain-text-sanctum-token"
}
```

Token created with name `api-token`, default abilities.

#### Response `401`

```json
{
  "message": "The provided credentials are incorrect."
}
```

---

## Authenticated: Logout

### `DELETE /api/logout`

**Route name:** `logout`

**Header:** `Authorization: Bearer {token}`

Deletes the **current** access token.

#### Response `204`

No content.

---

## Authenticated: Current User

### `GET /api/user`

**Header:** `Authorization: Bearer {token}`

#### Response `200`

Full User object (password hidden):

```json
{
  "id": 1,
  "name": "Test User",
  "email": "test@example.com",
  "email_verified_at": "2026-01-01T00:00:00.000000Z",
  "is_admin": false,
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Authenticated: List Applications

### `GET /api/applications`

**Route name:** `applications.index`

**Header:** `Authorization: Bearer {token}`

#### Response `200`

JSON array of applications owned by authenticated user (`user_id = auth.id`):

```json
[
  {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My App",
    "slug": "my-app",
    "description": null,
    "user_id": 1,
    "bundle_limit": 10,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

---

## Authenticated: Upload Bundle

### `POST /api/bundles`

**Route name:** `create-app-bundle`

**Content-Type:** `multipart/form-data`

**Header:** `Authorization: Bearer {token}`

#### Form fields

| Field | Required | Validation | Notes |
|-------|----------|------------|-------|
| `file` | Yes | file | ZIP archive |
| `application_id` | Yes | exists in applications (id **or** uuid) | UUID detected via `Str::isUuid()` |
| `channel` | No | exists:channels,name | Global name check; resolved scoped to app |
| `name` | No | string, max:255 | Defaults to original filename |
| `android_min_version_code` | No | integer, min:0 | |
| `android_max_version_code` | No | integer, min:0 | Must be ≥ min if both set |
| `android_eq_version_code` | No | integer, min:0 | Exclude exact match |
| `ios_min_version_code` | No | integer, min:0 | |
| `ios_max_version_code` | No | integer, min:0 | Must be ≥ min if both set |
| `ios_eq_version_code` | No | integer, min:0 | Exclude exact match |

#### Custom validation errors

When min > max:

```
The android_min_version_code must be less than or equal to android_max_version_code.
The ios_min_version_code must be less than or equal to ios_max_version_code.
```

HTTP **422** with validation error JSON.

#### Authorization

1. Resolve numeric application id (UUID → lookup id)
2. Verify `auth.user.applications.find(applicationId)` — if null:

**403:**
```json
{
  "message": "You are not authorized to upload bundles for this application"
}
```

3. If `bundles.count >= bundle_limit`:

**403:**
```json
{
  "message": "You have reached the maximum number of bundles for this application"
}
```

**Known bug:** `bundle_limit` null is treated as 0 in PHP `>=` comparison — may block uploads. Nuxt rebuild should only enforce when limit is non-null.

#### Processing

1. Store file to public disk / R2 at `bundles/{hash}`
2. Resolve `channel_id`: `Channel.where(name, channel).where(application_id, appId).value('id')`
3. Create bundle record with size from uploaded file
4. Trigger retention prune (see [12-business-rules-and-quirks.md](./12-business-rules-and-quirks.md))

#### Response `200`

Full created Bundle JSON (see [02-data-model.md](./02-data-model.md)).

---

## Web Auth Routes (Admin UI)

Session-based Breeze routes used by Filament admin. Document for Nuxt admin auth parity.

| Method | Path | Middleware | Response |
|--------|------|------------|----------|
| POST | `/register` | guest | 204; auto-login |
| POST | `/login` | guest | 204 |
| POST | `/logout` | auth | 204 |
| POST | `/forgot-password` | guest | 200 `{ status }` |
| POST | `/reset-password` | guest | 200 `{ status }` |
| GET | `/verify-email/{id}/{hash}` | auth, signed | redirect |
| POST | `/email/verification-notification` | auth | 200 |

### Registration validation

| Field | Rules |
|-------|-------|
| name | required, string, max:255 |
| email | required, lowercase, email, max:255, unique:users |
| password | required, confirmed, Password::defaults() |

### Web login (`LoginRequest`)

| Field | Rules |
|-------|-------|
| email | required, string, email |
| password | required, string |

Rate limit: **5 attempts** per `email|ip`. On failure: `auth.failed` / `auth.throttle` messages.

---

## Compatibility Checklist

Before shipping the Nuxt API, verify:

- [ ] All route paths and methods match exactly
- [ ] Header names are case-sensitive as documented
- [ ] JSON keys use snake_case
- [ ] `is_update_available` uses `!==` string comparison on bundle IDs
- [ ] `channel_bundle_id` fallback chain works
- [ ] Download sets `X-Bundle-Id` and `X-Bundle-Uuid`
- [ ] Upload accepts both numeric and UUID `application_id`
- [ ] 403 error messages match exact strings
- [ ] Login returns `{ token }` not `{ access_token }`
- [ ] Logout returns 204
