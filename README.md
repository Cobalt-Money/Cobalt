# cobalt-web

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Hono, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details and **Better Auth** settings:
   - `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL` (e.g. `http://localhost:3000`), `CORS_ORIGIN` (e.g. `http://localhost:3001`)
   - **Google:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_IOS_CLIENT_ID` (native iOS client id for the extra `google_ios` provider)
   - **Apple:** `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_SERVICE_ID`, `APPLE_APP_BUNDLE_IDENTIFIER`, `APPLE_PRIVATE_KEY` (PEM for Sign in with Apple)
   - Optional: `TRUSTED_ORIGINS_EXTRA` — comma-separated origins to add to Better Auth’s `trustedOrigins` (staging URLs, etc.)

   Email/password is **disabled**; sign-in is **Google and Apple only** (same idea as `horizon-test`).

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

This starts **web**, **API**, **Fumadocs**, and the **Zero dev cache** (`zero-cache-dev`, default `http://localhost:4848`) in parallel via Turborepo.

**Zero cache env:** copy `apps/zero-cache/.env.example` to `apps/zero-cache/.env` and set `ZERO_UPSTREAM_DB`, plus `ZERO_QUERY_URL` / `ZERO_MUTATE_URL` pointing at this repo’s API. Enable **`ZERO_QUERY_FORWARD_COOKIES=true`** and **`ZERO_MUTATE_FORWARD_COOKIES=true`** so session cookies reach `/api/zero/query` — otherwise `getSession` sees no user and Zero queries return empty rows. The `zero-cache` app loads **only** `apps/zero-cache/.env` via `dotenv-cli` — production sets the same variables on the host instead of a file.

**Roles (this project):** `DATABASE_URL` in `apps/server/.env` uses the **application** Postgres user (regular privileges). `ZERO_UPSTREAM_DB` uses the host’s **default / Zero upstream** role (per provider setup). They can point at the same cluster and database with **different users** — do not assume one URL is interchangeable with the other.

**Postgres connection limits:** SQLSTATE `53300` (*remaining connection slots are reserved for roles with the SUPERUSER attribute*) usually means **non-superuser** slots are exhausted; the app role behind `DATABASE_URL` hits that limit before elevated roles. `bun dev` runs the API (Drizzle pool + optional Zero mutate pool on `ZERO_UPSTREAM_DB`), **zero-cache**, and replication. Mitigations: use a **pooled** URL for the **application** role (e.g. Neon “Pooled”, Supabase `:6543`), lower `DATABASE_POOL_MAX` / `ZERO_DB_POOL_MAX`, stop duplicate dev processes, or raise `max_connections` / plan limits.

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@cobalt-web/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Project Structure

```
cobalt-web/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   └── server/      # Backend API (Hono)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
