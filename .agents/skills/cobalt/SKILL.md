---
name: Cobalt
description: Monorepo-specific conventions for the Cobalt stack (web, server, Zero, TanStack). Use when implementing features in this repo, choosing data layers, or aligning with established patterns.
version: 1.0.0
tags:
  - cobalt
  - monorepo
  - tanstack
  - zero
---

# Cobalt (internal)

Project-specific guidance that complements generic skills (e.g. Rocicorp Zero, Drizzle, Hono). Prefer these docs when behavior differs from “textbook” library defaults.

## Chapters

- **[Data fetching](data-fetching/SKILL.md)** — Zero vs TanStack Query, route loaders, prefetch, cache reuse, router context.
- **[Mutations](mutations/SKILL.md)** — Zero custom mutators vs REST (Hono RPC), when to use both, optimistic UX, server-data convergence.
- **[Workflows](workflows/SKILL.md)** — `workflow.ts` + `steps.ts` + `lib.ts`, server-data boundaries, step granularity, naming.
- **[Webhooks](webhooks/SKILL.md)** — thin HTTP transport, verification in server-data, dispatch to workflows, env + mounting conventions.
- **[Testing](testing/SKILL.md)** — co-located unit tests, server-based integration harness, mocking boundaries, DB-shape validation, what runs on every push vs manually.
- **[Type rules](type-rules/SKILL.md)** — when to annotate return types, when to infer, when to derive from zod (`z.infer`) instead of hand-writing interfaces.

## Quick pointers

- **Web app:** `apps/web/AGENTS.md`
- **Zero package:** `packages/zero/AGENTS.md`
- **Zero deep dive (generic):** `.agents/skills/rocicorp-zero/SKILL.md`
- **Reference app:** `.sandbox/ztunes` (Rocicorp’s TanStack Start + Zero patterns)
