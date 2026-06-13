# LaraCap Admin

Self-hosted Capacitor OTA admin panel and API — **Nuxt 4 full-stack on Cloudflare**.

Replaces [laracap-live-update](https://github.com/novalbayusetiawan/laracap-live-update) (Laravel + Filament) with strict backward compatibility for [cap-update](https://github.com/novalbayusetiawan/cap-update) and [laracap-cli](https://github.com/novalbayusetiawan/laracap-cli).

## Status

**Specification phase** — implementation follows [`docs/`](./docs/).

## Stack (Planned)

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| Admin UI | shadcn-vue + Tailwind |
| Deployment | Cloudflare Pages + Workers |
| Database | D1 (SQLite) |
| Bundle storage | R2 |
| ORM | Drizzle |

## Documentation

Start here: **[docs/README.md](./docs/README.md)**

| Doc | Description |
|-----|-------------|
| [00-overview](./docs/00-overview.md) | Product goals and scope |
| [03-api-contract](./docs/03-api-contract.md) | **Frozen API contract (P0)** |
| [06-admin-panel-spec](./docs/06-admin-panel-spec.md) | Filament → shadcn parity |
| [09-cloudflare-architecture](./docs/09-cloudflare-architecture.md) | Target deployment stack |

## Sibling Repositories

| Repo | Role |
|------|------|
| **laracap-admin** (this repo) | Nuxt rebuild — admin + API |
| laracap-live-update | Legacy Laravel reference |
| cap-update | Capacitor native OTA plugin |
| laracap-cli | CI bundle upload CLI |

## License

MIT
