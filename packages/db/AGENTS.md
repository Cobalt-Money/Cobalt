# packages/db

Database schema, migrations, and Drizzle ORM client for PostgreSQL.

## File Structure

```
src/
  index.ts        — Exports the Drizzle database client
  schema/
    auth.ts       — Database schema definitions (auth tables)
  migrations/     — Drizzle-generated migration files (post-squash: single commented init + future incremental files)
planetscale/
  README.md       — Local Postgres setup notes
drizzle.config.ts — Drizzle Kit config (PostgreSQL; paths resolved from this file so `out` / `schema` work from any cwd; loads `apps/server/.env` then `@cobalt-web/env/server`; `schemaFilter: ["public"]` excludes `archive` + `zero*` external schemas from drift detection). `apps/web/drizzle.config.ts` re-exports this package for convenience.

Local Postgres (Docker): repo root `docker-compose.local-db.yml`, **`docs/local-sync/`**, and **`planetscale/README.md`** (order: `bun db:local:up` → `bun db:local:setup`).
```

## Conventions

- Schema is defined in `src/schema/` using Drizzle ORM's schema builder
- Run `bun db:generate` from the repo root to generate migrations after schema changes
- Run `bun db:push` to push schema directly (dev) or `bun db:migrate` for migrations
- `drizzle.config.ts` loads the DATABASE_URL from `apps/server/.env`
- Exported via `@cobalt-web/db` — consumed by `@cobalt-web/auth` and `apps/server`

## Skills

Before modifying schema, queries, or migrations, read the relevant skill:

- **Drizzle ORM:** `.agents/skills/drizzle-orm/SKILL.md` — schema definition, relations, queries, transactions, migration workflows. Additional references in `.agents/skills/drizzle-orm/references/` for advanced schemas, query patterns, and performance.
- **PostgreSQL:** `.agents/skills/postgres/SKILL.md` — query optimization, connection troubleshooting, performance best practices

## Package References

When modifying schema or queries, read the source code of these packages for API reference:

- **drizzle-orm:** `node_modules/drizzle-orm/` — schema builder, column types, relations, query API
- **drizzle-kit:** `node_modules/drizzle-kit/` — migration generation, push, studio config
- **pg:** `node_modules/pg/lib/` — PostgreSQL client and pool configuration
