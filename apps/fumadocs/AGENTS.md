# apps/fumadocs

Documentation site built with Fumadocs, MDX, and TanStack Start.

## File Structure

```
content/
  docs/           — Documentation markdown/MDX files
src/
  components/     — MDX components (mdx.tsx), not-found page
  lib/            — Utility functions
  routes/
    __root.tsx    — Root layout
    index.tsx     — Home page
    api/          — API routes
    docs/         — Documentation page routes
    llms*.txt.ts  — LLM-friendly text endpoints
  styles/         — Global styles
.source/          — Fumadocs internal (generated)
.tanstack/        — TanStack internal (generated)
```

## Key Config Files

- `source.config.ts` — Fumadocs MDX config, points to `content/docs`
- `vite.config.ts` — Fumadocs MDX plugin, Tailwind CSS, TanStack Start with prerendering, Nitro (Vercel preset)

## Conventions

- Documentation content goes in `content/docs/` as MDX files
- Dev server runs on port 4000
- Deployed via Nitro with Vercel preset (SSR prerendering enabled)
- `.source/` and `.tanstack/` directories are generated — do not edit

## Package References

When building new features, read the source code of these packages for API reference:

- **fumadocs-core:** `node_modules/fumadocs-core/dist/` — source API, search, breadcrumbs, TOC
- **fumadocs-ui:** `node_modules/fumadocs-ui/dist/` — layout components, docs page, nav
- **fumadocs-mdx:** `node_modules/fumadocs-mdx/dist/` — MDX config, content collections
- **@tanstack/react-start:** `node_modules/@tanstack/react-start/dist/esm/` — SSR, server functions
