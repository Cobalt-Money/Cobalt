# apps/server

Backend API server built with Hono, running on Bun.

## File Structure

```
src/
  index.ts    — Main server entry point (Hono app, routes, auth handler, Zero push)
dist/         — Compiled output (tsdown)
```

## Key Config Files

- `tsdown.config.ts` — Build config: ESM output, externalizes `@cobalt-web/*` packages
- `.env` — Environment variables (DATABASE_URL, BETTER_AUTH_SECRET, etc.)

## Conventions

- Entry point is `src/index.ts` — all routes and middleware are defined here
- Uses `bun run --hot src/index.ts` for dev with hot reloading
- Auth is handled via `@cobalt-web/auth` package (Better Auth)
- Database access via `@cobalt-web/db` (Drizzle ORM)
- Zero push endpoint for Rocicorp Zero real-time sync
- Build produces a compiled binary via `bun build --compile`

## Skills

Before building or modifying server features, read the relevant skill:

- **Hono:** `.agents/skills/hono/SKILL.md` — documentation search, request testing, optimization
- **Drizzle ORM:** `.agents/skills/drizzle-orm/SKILL.md` — schema, queries, relations, migrations

## Package References

When building new features, read the source code of these packages for API reference:

- **hono:** `node_modules/hono/dist/types/` — app, router, context, middleware types and helpers
- **drizzle-orm:** `node_modules/drizzle-orm/` — query builder, schema helpers, relations
- **better-auth:** `node_modules/better-auth/dist/` — auth instance, plugins, session management
- **@rocicorp/zero:** `node_modules/@rocicorp/zero/dist/` — zero-cache, push protocol, schema
- **pg:** `node_modules/pg/lib/` — PostgreSQL client, pool, query
