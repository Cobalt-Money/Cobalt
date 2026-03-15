# packages/auth

Centralized Better Auth configuration shared by the web and server apps.

## File Structure

```
src/
  index.ts    — Exports the Better Auth instance configured with Drizzle adapter
```

## Conventions

- Auth config lives in `src/index.ts` — consumed by both `apps/web` and `apps/server`
- Uses `@cobalt-web/db` for the database adapter
- Uses `@cobalt-web/env` for auth secrets and configuration

## Package References

When modifying auth config, read the source code of these packages for API reference:

- **better-auth:** `node_modules/better-auth/dist/` — auth instance, plugins, adapters, session types
- **drizzle-orm:** `node_modules/drizzle-orm/` — adapter integration with Better Auth
