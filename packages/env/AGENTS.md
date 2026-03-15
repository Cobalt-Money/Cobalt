# packages/env

Zod-validated environment variables using `@t3-oss/env-core`, split by runtime.

## File Structure

```
src/
  server.ts    — Server-side env validation (DATABASE_URL, BETTER_AUTH_SECRET, etc.)
  web.ts       — Client-side env validation (API_URL, etc.)
```

## Conventions

- Import `@cobalt-web/env/server` for server-side env vars
- Import `@cobalt-web/env/web` for client-side env vars
- All environment variables are validated at runtime via Zod schemas
- Add new env vars to the appropriate file (`server.ts` or `web.ts`) with their Zod schema
