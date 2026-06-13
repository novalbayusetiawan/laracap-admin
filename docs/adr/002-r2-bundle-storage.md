---
title: ADR 002 — R2 Bundle Storage
status: accepted
audience: [ai-agent, developer]
depends_on: [09-cloudflare-architecture]
blocks: [bundle upload, bundle download]
compatibility: strict
---

# ADR 002: R2 for Bundle Storage with Worker Streaming

## Status

Accepted

## Context

Laravel stores bundles on the local `public` disk at `storage/app/public/bundles/`. Cloudflare Workers have no persistent filesystem. Bundle ZIPs can be large (up to 10 MB in admin UI).

## Decision

Store bundle ZIP files in **Cloudflare R2** at keys like `bundles/{uuid}.zip`.

Download endpoint streams from R2 via Nitro/Worker and **must** set response headers:

- `X-Bundle-Id` — numeric bundle ID
- `X-Bundle-Uuid` — bundle UUID string

Do **not** expose public R2 URLs to clients. All downloads go through the same `/api/applications/{uuid}/bundles/latest/download` route for compatibility checking and device tracking.

## Consequences

- Positive: Durable, scalable storage on free tier
- Positive: Edge-adjacent streaming from Workers
- Negative: Migration must copy existing files from Laravel `public` disk to R2
- Negative: `file_path` column semantics change from relative path to R2 object key (keep column name for JSON compat)

## Migration Note

During migration, map Laravel `file_path` values (e.g. `bundles/abc123.zip`) to R2 keys preserving the same path structure where possible.
