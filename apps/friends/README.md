# friends

Cobalt Friends — social spending map at `friends.cobaltpf.com`.

See where your friends spend money on a map. Shared backend with `cobalt-server`, separate UI surface from `cobalt-web`.

License: AGPL-3.0-only (same as the rest of Cobalt-Web).

## Stack

- TanStack Start (Vite + Nitro)
- React 19, Tailwind 4
- MapLibre GL JS + react-map-gl + deck.gl
- Zero client (shared `zero-cache` on Railway)
- Better Auth client (shared backend on `api.cobaltpf.com`)
- Shared UI via `@cobalt-web/ui`

## Dev

```bash
bun install   # from repo root
bun run dev --filter=friends
```

Runs at `http://localhost:3003`.

Tracked in [SRI-349](https://linear.app/sriket/issue/SRI-349).
