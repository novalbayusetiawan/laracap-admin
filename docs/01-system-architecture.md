---
title: System Architecture
status: specification
audience: [ai-agent, developer]
depends_on: [00-overview]
blocks: [cloudflare-architecture, api-contract]
compatibility: strict
---

# System Architecture

End-to-end architecture for the LaraCap OTA stack.

## High-Level Architecture

```mermaid
flowchart TB
    subgraph clients [Clients]
        CLI[laracap-cli]
        Plugin[cap-update plugin]
        Browser[Admin browser]
    end

    subgraph laracap [laracap-admin]
        Nuxt[Nuxt Pages - Admin UI]
        Nitro[Nitro API - Workers]
        D1[(D1 Database)]
        R2[R2 Bundle Storage]
        Queue[Cloudflare Queues]
        KV[Workers KV]
    end

    CLI -->|Bearer auth| Nitro
    Plugin -->|Public OTA| Nitro
    Browser -->|Session auth| Nuxt
    Nuxt --> Nitro
    Nitro --> D1
    Nitro --> R2
    Nitro --> Queue
    Queue --> D1
    Nitro --> KV
```

## Publish Flow (Developer → Server)

```mermaid
sequenceDiagram
    participant Dev as Developer / CI
    participant CLI as laracap-cli
    participant API as POST /api/bundles
    participant R2 as R2 Storage
    participant D1 as D1 Database
    participant Observer as Retention prune

    Dev->>CLI: apps:bundles:create -p ./dist
    CLI->>CLI: Zip directory (archiver, level 9)
    CLI->>API: POST multipart + Bearer token
    API->>API: Validate ownership + bundle_limit
    API->>R2: Store bundles/{hash}.zip
    API->>D1: Insert bundle record
    API->>Observer: Prune oldest if over limit
    API-->>CLI: 200 Bundle JSON
```

### Steps

1. **Authenticate** — `POST /api/login` → bearer token (or use stored token / Filament-created token)
2. **Select app** — `GET /api/applications` or `--app-id`
3. **Upload** — `POST /api/bundles` with ZIP + optional channel + version constraints
4. **Retention** — Observer deletes oldest bundles beyond `bundle_limit`

## Runtime Flow (Device → Server)

```mermaid
sequenceDiagram
    participant App as Capacitor App
    participant Plugin as cap-update
    participant Check as GET .../bundles/latest
    participant DL as GET .../download
    participant R2 as R2 Storage
    participant Queue as Device tracking

    App->>Plugin: sync({ url, channel })
    Plugin->>Check: Headers: device, platform, channel, version
    Check->>Queue: TrackDevice (async)
    Check->>Check: Find compatible bundle + compare IDs
    Check-->>Plugin: is_update_available + download_url

    alt update needed
        Plugin->>DL: GET download_url + same headers
        DL->>Queue: TrackDevice type=download
        DL->>R2: Stream ZIP
        DL-->>Plugin: ZIP + X-Bundle-Id
        Plugin->>Plugin: Extract + setServerBasePath
        Plugin->>App: reload()
    end
```

### cap-update `sync()` decision logic

1. Call check endpoint
2. Proceed if `isUpdateAvailable` **OR** active bundle ≠ latest bundle ID
3. If bundle already cached locally → activate without re-download
4. Else download, extract to `cap_update_bundles/{id}/`, set server path, reload

See [04-ota-protocol.md](./04-ota-protocol.md).

## Admin Flow (Browser → Server)

```mermaid
sequenceDiagram
    participant User as Admin user
    participant Nuxt as Nuxt /admin
    participant Session as Session auth
    participant D1 as D1
    participant R2 as R2

    User->>Nuxt: Login / register
    Nuxt->>Session: Create session
    User->>Nuxt: Manage apps, bundles, channels
    Nuxt->>D1: CRUD with tenancy scoping
    User->>Nuxt: Upload bundle ZIP
    Nuxt->>R2: Store file
    Nuxt->>D1: Create bundle record
```

Legacy Filament admin at `/admin` uses the same session as Breeze web auth.

## Three Auth Surfaces

| Surface | Used by | Mechanism |
|---------|---------|-----------|
| Public OTA | cap-update | No auth |
| Bearer API | laracap-cli | Sanctum-style token |
| Session | Admin UI | Cookie session |

See [07-auth-and-tenancy.md](./07-auth-and-tenancy.md).

## Laravel Legacy Stack (Reference)

| Layer | Technology |
|-------|------------|
| Framework | Laravel 12 |
| Admin | Filament v4 |
| API auth | Sanctum 4 |
| Web auth | Breeze 2 |
| Database | SQLite (default) |
| Queue | Database driver |
| Bundle storage | `public` disk |
| Device geo | ip-api.com + cache |

## Key Business Logic Components

| Component | Laravel path | Nuxt target |
|-----------|--------------|-------------|
| OTA check | `LatestAppBundleController` | `server/api/applications/[uuid]/bundles/latest.get.ts` |
| OTA download | `LatestAppBundleDownloadController` | `.../download.get.ts` |
| Bundle upload | `BundleController` | `server/api/bundles.post.ts` |
| Version constraints | `NativeVersionConstraintService` | `server/utils/nativeVersionConstraints.ts` |
| Device tracking | `TrackDeviceJob` | Queue consumer |
| Retention | `BundleObserver` | Post-create hook |
| Admin CRUD | `app/Filament/Resources/*` | `app/pages/admin/**/*.vue` |

## External Dependencies

| Service | Used for | Cloudflare replacement |
|---------|----------|------------------------|
| ip-api.com | Device geolocation | KV cache + optional CF headers |
| Git pull (sync-update) | Admin self-update | Cloudflare deploy hook |

## Health Check

Laravel exposes `GET /up` — consider equivalent health endpoint in Nuxt rebuild.
