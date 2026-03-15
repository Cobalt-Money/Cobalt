# packages/db

Database schema, migrations, and Drizzle ORM client for PostgreSQL.

## File Structure

```
src/
  index.ts        — Exports the Drizzle database client
  schema/
    auth.ts       — Database schema definitions (auth tables)
  migrations/     — Drizzle-generated migration files
drizzle.config.ts — Drizzle Kit config (PostgreSQL, loads DATABASE_URL from apps/server/.env)
```

## Conventions

- Schema is defined in `src/schema/` using Drizzle ORM's schema builder
- Run `bun db:generate` from the repo root to generate migrations after schema changes
- Run `bun db:push` to push schema directly (dev) or `bun db:migrate` for migrations
- `drizzle.config.ts` loads the DATABASE_URL from `apps/server/.env`
- Exported via `@cobalt-web/db` — consumed by `@cobalt-web/auth` and `apps/server`

## Package References

When modifying schema or queries, read the source code of these packages for API reference:

- **drizzle-orm:** `node_modules/drizzle-orm/` — schema builder, column types, relations, query API
- **drizzle-kit:** `node_modules/drizzle-kit/` — migration generation, push, studio config
- **pg:** `node_modules/pg/lib/` — PostgreSQL client and pool configuration
