# packages/env

Zod-validated environment variables using `@t3-oss/env-core`, split by runtime.

## File Structure

```
src/
  server.ts    — Full server env validation (API, DB, auth, billing, …)
  web.ts       — Client-side env validation (VITE_*)
  docs.ts      — Fumadocs-only env (OpenAPI + OpenRouter) — avoids requiring the full server schema
```

## Conventions

- Import `@cobalt-web/env/server` for server-side env vars
- Import `@cobalt-web/env/web` for client-side env vars
- Import `@cobalt-web/env/docs` only in the Fumadocs app (subset schema)
- All environment variables are validated at runtime via Zod schemas
- Add new env vars to the appropriate file (`server.ts` or `web.ts`) with their Zod schema
