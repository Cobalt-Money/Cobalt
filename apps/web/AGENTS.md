# apps/web

Main frontend application built with Vite, React 19, and the TanStack ecosystem (Router, Query, Start).

## File Structure

```
src/
  components/     — App-only UI (not @cobalt-web/ui)
    shell/          — Sidebar + header chrome (dashboard layout)
    auth/           — Sign-in and auth-related UI
    feedback/       — Loaders, banners, empty states
  functions/      — Server functions (get-user.ts)
  lib/            — Client setup (auth-client.ts, zero-client.tsx)
  middleware/     — Route middleware (auth.ts for route protection)
  routes/         — TanStack Router file-based routes
    __root.tsx    — Root layout
    index.tsx     — Home page
    dashboard.tsx — Dashboard page
    login.tsx     — Login page
  router.tsx      — TanStack Router configuration
  routeTree.gen.ts — Auto-generated route tree (do not edit)
  index.css       — Global styles
  assets/         — Optional: imported images/SVG (bundled + hashed by Vite)
public/
  assets/         — Static files by URL: icons/, vectors/, illustrations/ (see public/assets/README.md)
  robots.txt
```

## Key Config Files

- `.env.example` — Client env template (`VITE_SERVER_URL`, optional `VITE_ZERO_CACHE_URL` for Rocicorp zero-cache); validated via `@cobalt-web/env/web`.
- `vite.config.ts` — Vite config with TanStack Start (**SPA mode** via `tanstackStart({ spa: { enabled: true } })`), Tailwind CSS v4, and React plugins. The app shell is not server-rendered; this matches Rocicorp’s guidance for Zero ([ztunes](https://github.com/rocicorp/ztunes#tanstack-start)). API routes and server functions still run on the server.
- `drizzle.config.ts` — Re-exports `packages/db/drizzle.config.ts` so you can run Drizzle Kit from this app (`bun run db:push`, etc.). Schema and migrations live in **`packages/db`**; `DATABASE_URL` is read from **`apps/server/.env`**.
- `components.json` — Shadcn UI config (base-lyra style), references `@cobalt-web/ui` globals
- `tsconfig.json` — Path aliases: `@/*` maps to `./src/*`, `@cobalt-web/ui/*` maps to UI package

## Conventions

- Routes are file-based via TanStack Router — add new routes as files in `src/routes/`
- `routeTree.gen.ts` is auto-generated; never edit it manually
- UI components come from `@cobalt-web/ui/components/*` (Shadcn)
- Auth client is in `src/lib/auth-client.ts`; Zero is in `src/lib/zero-client.tsx` — **`ZeroProvider` wraps the app shell in `routes/__root.tsx`** (ztunes-style). Rocicorp’s `ZeroProvider` renders nothing until the client is ready, so the shell is blank until then.
- Route protection is handled via middleware in `src/middleware/auth.ts`
- Dev server runs on port 3001
- Database schema is **not** defined in `apps/web` — use `bun run db:push` / `db:generate` here (or `bun db:push` from repo root) against `packages/db`

## Package References

When building new features, read the source code of these packages for API reference:

- **@tanstack/react-router:** `node_modules/@tanstack/react-router/dist/esm/` — route definitions, loaders, hooks
- **@tanstack/react-query:** `node_modules/@tanstack/react-query/dist/esm/` — useQuery, useMutation, queryClient
- **@tanstack/react-start:** `node_modules/@tanstack/react-start/dist/esm/` — server functions, SSR utilities
- **@tanstack/react-form:** `node_modules/@tanstack/react-form/dist/esm/` — form hooks, field validation
- **@rocicorp/zero:** `node_modules/@rocicorp/zero/dist/` — Zero client, useQuery, schema types
- **better-auth:** `node_modules/better-auth/dist/client/` — auth client, session hooks
- **lucide-react:** `node_modules/lucide-react/dist/esm/` — icon components
- **sonner:** `node_modules/sonner/dist/` — toast notifications
