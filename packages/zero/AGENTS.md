# packages/zero

Rocicorp Zero client configuration — schema, queries, and mutators for real-time sync.

## File Structure

```
src/
  index.ts       — Main export (Zero client setup)
  schema.ts      — Zero schema definition (tables and relationships)
  queries.ts     — Zero data queries
  mutators.ts    — Zero CRUD mutations
  auth.ts        — Auth-related Zero operations
```

## Conventions

- Import the schema via `@cobalt-web/zero/schema`
- Import queries via `@cobalt-web/zero/queries`
- Import mutators via `@cobalt-web/zero/mutators`
- The Zero schema mirrors the Drizzle schema in `@cobalt-web/db` — keep them in sync
- After any Drizzle schema change, regenerate: `cd packages/zero && bun run generate:zero`. Stale `zero-schema.gen.ts` causes `SchemaVersionNotSupported` in zero-cache (e.g. client expects columns that Postgres replication does not publish).
- Zero client is initialized in `apps/web/src/lib/zero-client.tsx`
- Zero push endpoint is in `apps/server/src/index.ts`

## Package References

When modifying Zero schema or queries, read the source code of `@rocicorp/zero` for API reference:

- **@rocicorp/zero:** `node_modules/@rocicorp/zero/dist/` — schema definition, query types, mutator API, permissions
