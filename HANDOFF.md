# Friends App — Landing Page / SEO Handoff

> Branch: `spa-landing-page-seo-options`
> Status: code complete, build green, tsc green. Awaiting migrations + seed run + local smoke test.

## Goal

Give the `friends` app (Pocketwatch) a real landing-page surface for SEO + social previews + LLM crawlers without building a separate marketing site. Unauthenticated visitors see the same interactive map as authed users, populated from a hand-curated, shared, read-only demo network. Authed users see real data.

## Why not...?

- **Static marketing page at `/`** — splits authed app to `/app`, breaks invite URLs, doubles surface area.
- **Per-visitor demo (existing `seedDemoUser` flow)** — needs a click to mint an anonymous session + write DB rows. Cold landing visitors + crawlers don't trigger it, so initial HTML stays empty.
- **Build-time prerender of the full map** — `maplibre-gl` + `deck.gl` reference `window`/canvas at module load → crash on Node prerender.

Chosen approach: **shared demo network** seeded into real tables, served to anon callers via server-side query substitution. Combined with TanStack Start SPA mode so the static HTML shell ships proper `<head>` meta for crawlers.

## Architecture in one breath

1. `ZeroProvider` passes `userID: "anon"` with no auth token when there's no session.
2. Social Zero queries detect `!ctx?.userId` and substitute `DEMO_USER_ID` (or scope to `DEMO_NETWORK_IDS`) so anon callers read demo rows only.
3. Mutators all check `ctx?.userId` first and throw `"Unauthorized"` for anon — write surface is zero.
4. `TopBar` has an anon branch (brand + Sign in CTA, no profile menu / Plaid).
5. `/` route no longer redirects anon to `/signin` — renders the map regardless; demo data populates it.
6. TanStack Start SPA mode owns the document — root route `head()` emits title / meta / OG / Twitter / canonical / JSON-LD `SoftwareApplication`. Prerender produces a static `_shell.html` with all of that intact.

## What changed

### Added
- `packages/zero/src/social/constants.ts` — `DEMO_USER_ID`, `DEMO_NETWORK_IDS`
- `packages/db/src/demo/seed-demo-network.ts` — idempotent seed for 6 users (John Doe + Ava/Ben/Cleo/Dax/Eli), 6 manual accounts, 12 transactions, 12 social_posts (SF + NYC coords), 5 friendships
- `packages/db/scripts/seed-demo-network.ts` — CLI wrapper
- `apps/friends/src/router.tsx` — `getRouter()` factory with QueryClient on context
- `apps/friends/src/client.tsx` — `hydrateRoot(document, <StartClient />)` + DEV `react-grab` import

### Modified
- `packages/zero/src/social/queries.ts`
  - `friendships`, `postDetail`, `postsMine`, `privacyZones`, `visibilityRules` substitute `DEMO_USER_ID` for anon
  - `postsAll` server-side filters to `userId IN DEMO_NETWORK_IDS` when anon
  - `friendProfiles` intersects `args.ids` with `DEMO_NETWORK_IDS` when anon (prevents arbitrary user-directory enumeration)
  - `invitesPending`, `invitesSent` keep `NO_MATCH_ID` for anon (empty)
- `apps/friends/src/lib/zero-provider.tsx` — `userID: authenticatedUserId ?? "anon"`
- `apps/friends/src/routes/__root.tsx` — `head()` with full meta + OG + Twitter card + JSON-LD; `<RootDocument>` shell with `<HeadContent />` / `<Scripts />`; QueryClient + Zero providers wrap inside body
- `apps/friends/src/routes/index.tsx` — dropped `<Navigate to="/signin" />` for anon; map renders for everyone
- `apps/friends/src/components/top-bar.tsx` — anon branch (brand + "by Cobalt" link + Sign in button); existing authed branch untouched
- `apps/friends/vite.config.ts` — `tanstackStart({ spa: { enabled: true } })` + `viteReact()` (Start docs require react plugin AFTER Start)
- `apps/friends/package.json` — dropped `@tanstack/router-plugin`, added `@tanstack/react-start@^1.168.25`, bumped `vite` ^6 → ^7 (Start requires vite ≥7), kept `@react-grab/mcp` from main
- `packages/db/package.json` — added `seed:demo-network` script

### Deleted
- `apps/friends/index.html` — root route owns the document now
- `apps/friends/src/main.tsx` — replaced by `client.tsx`

## Demo network IDs (hardcoded)

```
demo-pocketwatch-root       John Doe
demo-friend-ava             Ava Chen
demo-friend-ben             Ben Park
demo-friend-cleo            Cleo Reyes
demo-friend-dax             Dax Miller
demo-friend-eli             Eli Tanaka
```

Renaming an id means editing both `packages/zero/src/social/constants.ts` and `packages/db/src/demo/seed-demo-network.ts`.

## How to run locally

```bash
# 1. Apply main's `places` refactor migrations
bun --filter=@cobalt-web/db run db:migrate:local

# 2. Seed the shared demo network (idempotent)
bun --filter=@cobalt-web/db run seed:demo-network

# 3. Start zero-cache if not already running
bun --filter=zero-cache dev

# 4. Start friends app
bun --filter=friends dev

# 5. localhost:3003 in incognito (no session) → demo map renders
#    localhost:3003 normal tab (authed) → real data renders
```

Verify the prerendered HTML:
```bash
bun --filter=friends run build
cat apps/friends/dist/client/_shell.html
# expect: <title>, <meta description>, og:*, twitter:*, JSON-LD SoftwareApplication
```

## Security notes

- All Zero mutators across `social`, `transactions`, `accounts`, `categories`, `tags`, `brokerage`, `chats` check `ctx?.userId` first → `throw new Error("Unauthorized")` for anon. Write surface = zero.
- `social.postsAll` is server-side scoped (`WHERE userId IN DEMO_NETWORK_IDS`) for anon — real posts never leak.
- `social.friendProfiles` intersects `args.ids` with `DEMO_NETWORK_IDS` for anon — malicious client cannot enumerate real user profiles via Zero subscription.
- All other queries (`transactions.*`, `brokerage.*`, `alerts.*`, `tags.*`, etc.) keep `ctx?.userId ?? NO_MATCH_ID` → return empty for anon.
- Cleanup cron sweeps `isAnonymous: true` rows; demo network is `isAnonymous: false` so cron leaves it alone.

## Open polish / future work

- **OG image asset** — `__root.tsx` references `https://friends.cobaltpf.com/og-image.png` but the PNG doesn't exist in `apps/friends/public/`. Drop in a 1200×630 image before launch or social previews are broken.
- **John Doe's own pins** — `transactions.list` for anon returns empty (uses `NO_MATCH_ID`). Map shows friend posts only, no "self" pin. Substituting `DEMO_USER_ID` here is risky (transactions table holds real data — would expose ALL real users' transactions if mis-scoped). Skipped for safety. If desired, add an explicit anon-only query that filters to `userId IN DEMO_NETWORK_IDS`.
- **Prerender body content** — currently SPA shell only. Body emits empty `<div>` + hydration script. Google runs JS so fine for search; non-JS crawlers / LLM scrapers only see meta. To add semantic body content (without breaking maplibre/deck.gl): split `routes/index.tsx` into a synchronous `<LandingMarkup />` (renderable on Node, no browser APIs) shown when `typeof window === "undefined"`, with `<FriendsMap />` mounting after hydrate.
- **Anon map markers from queries** that use `friendProfiles` still rely on the constants array; if `DEMO_NETWORK_IDS` ever grows long, switch the intersect to a `Set` for O(1) lookups.
- **Re-enable build-time prerender for `/`** in `vite.config.ts` (`prerender: { routes: ["/"] }`) once the landing markup split is in place.

## Test plan for smoke

- [ ] Migrations + seed run cleanly (no FK violations, no unique violations on re-seed)
- [ ] Incognito `localhost:3003`:
  - [ ] `<title>Pocketwatch</title>` appears in raw HTML (view-source)
  - [ ] Map renders with 12 pins clustered SF + NYC
  - [ ] Friend list shows John Doe + 5 friends
  - [ ] TopBar shows brand + "by Cobalt" link + Sign in button (no avatar menu)
  - [ ] Clicking a pin opens detail view (read-only)
  - [ ] Network tab: any mutation attempt returns "Unauthorized"
- [ ] Authed tab:
  - [ ] Real friend graph + posts unchanged
  - [ ] TopBar avatar menu + Plaid + Settings work
- [ ] Build: `dist/client/_shell.html` contains OG + Twitter + JSON-LD
- [ ] OG preview check: paste `https://friends.cobaltpf.com` into iMessage / Slack / opengraph.xyz after deploy

## Open questions / decisions to revisit

- Should John Doe's own transactions show as pins on the demo map? (See "Open polish" above for the trade-off.)
- Should the demo network grow beyond 5 friends? More friends = richer first impression but larger seed surface to maintain.
- Should the OG image be auto-generated per route (satori / og-image lib) or one static file?
- Per-route `head()` overrides — currently only root has meta. `/signin` could have its own title for completeness.

## Co-author

Built with Claude (Opus 4.7, 1M context). Session transcript available — ask Sriket if you need the full reasoning trail.
