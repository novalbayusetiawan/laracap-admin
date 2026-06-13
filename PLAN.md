# LaraCap Admin — Rebuild Plan

This file summarizes the rebuild specification. **Full specs live in [`docs/`](./docs/).**

## Goal

Rebuild laracap-live-update (Laravel 12 + Filament v4) as Nuxt 4 full-stack + shadcn-vue on Cloudflare, with **strict API backward compatibility** for cap-update v8.x and laracap-cli v1.x.

## Documentation Index

See [docs/README.md](./docs/README.md) for reading order and AI agent playbook.

### Phase 1 — Contracts (P0)

- [02-data-model.md](./docs/02-data-model.md) — D1 schema, full DDL
- [03-api-contract.md](./docs/03-api-contract.md) — Frozen REST API
- [04-ota-protocol.md](./docs/04-ota-protocol.md) — cap-update integration
- [05-cli-integration.md](./docs/05-cli-integration.md) — laracap-cli contract

### Phase 2 — Architecture

- [00-overview.md](./docs/00-overview.md)
- [01-system-architecture.md](./docs/01-system-architecture.md)
- [09-cloudflare-architecture.md](./docs/09-cloudflare-architecture.md)
- [adr/](./docs/adr/) — ADRs 001–003

### Phase 3 — Admin & Rules

- [06-admin-panel-spec.md](./docs/06-admin-panel-spec.md) — Full Filament inventory
- [07-auth-and-tenancy.md](./docs/07-auth-and-tenancy.md)
- [08-device-tracking.md](./docs/08-device-tracking.md)
- [12-business-rules-and-quirks.md](./docs/12-business-rules-and-quirks.md)

### Phase 4 — Migration & QA

- [10-migration-from-laravel.md](./docs/10-migration-from-laravel.md)
- [11-test-matrix.md](./docs/11-test-matrix.md)

## Implementation Order (for AI agents)

1. D1 schema + Drizzle (`02`, ADR 003)
2. Public OTA API (`03`, `04`) — validate against cap-update
3. Auth + upload API (`03`, `05`, `07`) — validate against laracap-cli
4. R2 storage (ADR 002)
5. Admin UI (`06`)
6. Device tracking (`08`)
7. Tests (`11`)

## Out of Scope (v1)

- cap-update / laracap-cli code changes
- Canary rollouts, webhooks, teams/RBAC
- Full Nuxt app implementation until specs are approved

## Nuxt Stubs

Minimal project stubs (`nuxt.config.ts`, `wrangler.toml`, `package.json`) are placeholders — run `npm install` and scaffold Nuxt when implementation begins.
