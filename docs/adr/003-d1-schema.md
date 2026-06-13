---
title: ADR 003 — D1 as Primary Database
status: accepted
audience: [ai-agent, developer]
depends_on: [02-data-model]
blocks: [all persistence]
compatibility: strict
---

# ADR 003: D1 as Primary Database

## Status

Accepted

## Context

Laravel defaults to SQLite. Cloudflare D1 is SQLite-compatible and fits the free-tier deployment model for Nuxt on Pages/Workers.

## Decision

Use **Cloudflare D1** as the sole application database with **Drizzle ORM**.

Replicate the Laravel schema from `02-data-model.md` including:

- Domain tables: users, applications, channels, bundles, devices, device_logs, personal_access_tokens
- Auth infrastructure: sessions, password_reset_tokens
- Optional: cache, jobs tables if not replaced by KV/Queues entirely

Skip or defer the unused `application_user` pivot unless teams/RBAC is implemented.

## Consequences

- Positive: SQLite schema maps 1:1 from Laravel migrations
- Positive: bcrypt password hashes migrate without re-hashing
- Negative: D1 has row/size limits on free tier — monitor bundle metadata growth
- Negative: No Eloquent; use Drizzle queries with explicit scoping for tenancy

## ORM Target

```
server/database/schema.ts   — Drizzle table definitions
drizzle/migrations/         — D1 migration SQL
```
