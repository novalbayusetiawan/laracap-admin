---
title: LaraCap Rebuild Wiki Index
status: specification
audience: [ai-agent, developer]
depends_on: []
blocks: [all implementation]
compatibility: strict
---

# LaraCap Rebuild Specification Wiki

Self-hosted Capacitor OTA server rebuild: **Laravel 12 + Filament v4** → **Nuxt 4 full-stack + shadcn-vue on Cloudflare**.

## Sibling Repositories

| Repo | Role |
|------|------|
| [laracap-live-update](https://github.com/novalbayusetiawan/laracap-live-update) | Legacy Laravel server (reference implementation) |
| [cap-update](https://github.com/novalbayusetiawan/cap-update) | Capacitor native plugin v8.x — **must not break** |
| [laracap-cli](https://github.com/novalbayusetiawan/laracap-cli) | NPM CLI for CI uploads — **must not break** |
| **laracap-admin** (this repo) | Nuxt rebuild target |

## Reading Order

1. [00-overview.md](./00-overview.md) — Product goals and scope
2. [01-system-architecture.md](./01-system-architecture.md) — End-to-end flows
3. [02-data-model.md](./02-data-model.md) — Database schema (D1 target)
4. [03-api-contract.md](./03-api-contract.md) — **Frozen API contract (P0)**
5. [04-ota-protocol.md](./04-ota-protocol.md) — cap-update ↔ server protocol
6. [05-cli-integration.md](./05-cli-integration.md) — laracap-cli contract
7. [06-admin-panel-spec.md](./06-admin-panel-spec.md) — Filament → shadcn parity
8. [07-auth-and-tenancy.md](./07-auth-and-tenancy.md) — Dual auth systems
9. [08-device-tracking.md](./08-device-tracking.md) — Fleet analytics
10. [09-cloudflare-architecture.md](./09-cloudflare-architecture.md) — Target stack
11. [10-migration-from-laravel.md](./10-migration-from-laravel.md) — Migration guide
12. [11-test-matrix.md](./11-test-matrix.md) — Test coverage requirements
13. [12-business-rules-and-quirks.md](./12-business-rules-and-quirks.md) — Rules, edge cases, bugs
14. [adr/](./adr/) — Architecture Decision Records

## Glossary

| Term | Definition |
|------|------------|
| **Bundle** | Zipped web assets (HTML/JS/CSS) deployed OTA to Capacitor apps |
| **Channel** | Named release stream (e.g. `production`, `staging`) scoped to an application |
| **Channel bundle ID** | Last bundle ID the device applied for a specific channel (`X-Channel-Bundle-Id`) |
| **Native version code** | Android `versionCode` or iOS `CFBundleVersion`, sent as `X-App-Version-Code` |
| **Unconstrained bundle** | Bundle with all 6 version constraint fields null — eligible for all devices |
| **Application UUID** | Public identifier used in OTA URLs; numeric `id` used by CLI |

## AI Agent Playbook

1. Read **`03-api-contract.md`** and **`04-ota-protocol.md`** before writing any API routes.
2. Implement D1 schema from **`02-data-model.md`** (see ADR 003).
3. Match admin UI to **`06-admin-panel-spec.md`** using shadcn-vue.
4. Store bundles in R2 per **`09-cloudflare-architecture.md`** (see ADR 002).
5. Validate behavior against **`11-test-matrix.md`**.

## Do Not Change (Strict Compatibility)

- Route paths: `/api/applications/{uuid}/bundles/latest`, `/download`, `/api/bundles`, `/api/login`, etc.
- Request header names: `X-Device-Identifier`, `X-Platform`, `X-Bundle-Id`, `X-Channel`, `X-Channel-Bundle-Id`, `X-App-Version-Code`
- Response JSON keys: snake_case (`is_update_available`, `latest_bundle`, `download_url`, …)
- Bundle comparison: inequality (`!==`), not greater-than
- Download response headers: `X-Bundle-Id`, `X-Bundle-Uuid`
- CLI multipart field names: `android_min_version_code`, etc.

## Frontmatter Convention

Every spec doc includes YAML frontmatter:

```yaml
---
title: Document Title
status: specification
audience: [ai-agent, developer]
depends_on: [other-doc-without-extension]
blocks: [what-this-unblocks]
compatibility: strict | n/a
---
```
