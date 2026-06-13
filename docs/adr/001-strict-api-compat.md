---
title: ADR 001 — Strict API Backward Compatibility
status: accepted
audience: [ai-agent, developer]
depends_on: [03-api-contract, 04-ota-protocol, 05-cli-integration]
blocks: [server/api implementation]
compatibility: strict
---

# ADR 001: Strict API Backward Compatibility

## Status

Accepted

## Context

Existing Capacitor apps use **cap-update** v8.x and CI pipelines use **laracap-cli** v1.x. Both depend on the Laravel server's HTTP contract. Breaking changes would require coordinated releases across three repos.

## Decision

The Nuxt rebuild **must preserve** the existing public and authenticated API contracts exactly:

- Same route paths and HTTP methods
- Same request headers and query/body parameter names
- Same JSON response shapes (raw model serialization, snake_case keys)
- Same error status codes and message strings where documented
- Same download response headers

Admin UI and internal implementation may change completely; only the external API surface is frozen.

## Consequences

- Positive: Zero client changes required for existing apps and CI
- Positive: Can validate Nuxt server by running existing Pest tests (adapted) and cap-update example-app
- Negative: Cannot fix API design debt (e.g. global channel validation) without a future `/api/v2`
- Negative: Must replicate quirks like string-cast bundle ID comparison

## Compliance Checklist

Before shipping, verify:

- [ ] cap-update `sync()` works against Nuxt server
- [ ] laracap-cli `apps:bundles:create` uploads successfully
- [ ] All P0 tests in `11-test-matrix.md` pass
