# apps/server

Backend API server built with Hono, running on Bun.

## File Structure

```
src/
  index.ts    — Main server entry point (Hono app, routes, auth handler, Zero push)
dist/         — Compiled output (tsdown)
```

## Deployment

**Deployed to Vercel** (see `vercel.json`). Uses Vercel Experimental Backends (`VERCEL_EXPERIMENTAL_BACKENDS=1`).

- `apps/server` → Vercel
- `apps/web` → Vercel
- `apps/zero-cache` → Railway (separate service, **not** Vercel)

### AI Gateway

AI chat streaming uses **Vercel AI Gateway**. Set the following in the Vercel project environment variables:

| Variable             | Description                                                         |
| -------------------- | ------------------------------------------------------------------- |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway API key (`vck_...`). Auto-injected on Vercel.     |
| `AI_GATEWAY_MODEL`   | Optional model override. Defaults to `anthropic/claude-sonnet-4.6`. |

Model strings follow the gateway format: `anthropic/claude-haiku-4.5`, `anthropic/claude-sonnet-4.6`, `vertex/gemini-2.5-flash`, etc. See [Vercel AI Gateway docs](https://vercel.com/docs/ai-gateway) for supported providers.

## Key Config Files

- `tsdown.config.ts` — Build config: ESM output, externalizes `@cobalt-web/*` packages
- `vercel.json` — Vercel deployment config (Bun runtime, build command)
- `.env` — Environment variables (DATABASE_URL, BETTER_AUTH_SECRET, etc.)

## Conventions

- Entry point is `src/index.ts` — all routes and middleware are defined here
- Uses `bun run --hot src/index.ts` for dev with hot reloading
- Auth is handled via `@cobalt-web/auth` package (Better Auth)
- Database access via `@cobalt-web/db` (Drizzle ORM)
- Zero push endpoint for Rocicorp Zero real-time sync
- Build produces a compiled binary via `bun build --compile`

## Hono RPC chain contract

**Every route, middleware, and sub-router registration MUST be chained into the `const` declaration it belongs to.** Hono's `.route()`, `.get()`, `.post()`, `.openapi()`, etc. return a _new_ type carrying the accumulated route schema — the statement form throws that type away and `typeof app` stays empty, breaking `hc<AppType>` in the web client.

```ts
// ❌ BAD — types lost, web client ends up untyped
const router = new OpenAPIHono<AppEnv>();
router.openapi(routeA, handlerA);
router.openapi(routeB, handlerB);

// ✅ GOOD — types propagate up through `typeof app`
const router = new OpenAPIHono<AppEnv>().openapi(routeA, handlerA).openapi(routeB, handlerB);
```

**Auth gotcha:** `.use("/*", requireAuth)` returns a plain `Hono` and drops OpenAPIHono's `.openapi()` method from the chain's return type. Do NOT chain `.use(path, middleware)` before `.openapi(...)`. Instead, attach auth at the route level via `createRoute`'s `middleware` field:

```ts
const protectedRoute = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/...",
  // ...
});
```

Every router file under `src/api/**` follows this contract. Preserve it when adding new routes.

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
