# packages/ui

Shared React component library built with Shadcn, Tailwind CSS v4, and class-variance-authority.

## File Structure

```
src/
  components/       — All Shadcn UI components (every component is installed)
  hooks/            — Shared React hooks (use-mobile, etc.)
  lib/              — Utilities (cn/clsx helper, etc.)
  styles/
    globals.css     — Global Tailwind styles and theme
components.json     — Shadcn UI generation config (base-lyra style)
postcss.config.mjs  — PostCSS config
```

Every Shadcn component is available. Import any component directly — no need to install individually. Check `src/components/` for the full list or run `ls packages/ui/src/components/`.

## Conventions

- Import components via `@cobalt-web/ui/components/*` (e.g., `@cobalt-web/ui/components/button`)
- Import hooks via `@cobalt-web/ui/hooks/*`
- Import utilities via `@cobalt-web/ui/lib/*`
- Global styles are at `@cobalt-web/ui/globals.css`
- To add new Shadcn components, use the Shadcn CLI or manually add to `src/components/`
- Uses `@base-ui/react` as the headless primitive layer

## Skills

When building or modifying components, read the relevant skill:

- **Tailwind Design System:** `.agents/skills/tailwind-design-system/SKILL.md` — design tokens, component variants, theming, responsive patterns, Tailwind v4

## Package References

When building new components, read the source code of these packages for API reference:

- **@base-ui/react:** `node_modules/@base-ui/react/` — headless primitives (dialog, popover, menu, etc.)
- **class-variance-authority:** `node_modules/class-variance-authority/dist/` — cva variant helper
- **tailwind-merge:** `node_modules/tailwind-merge/dist/` — twMerge for class deduplication
- **lucide-react:** `node_modules/lucide-react/dist/esm/` — icon components
- **sonner:** `node_modules/sonner/dist/` — toast notification API
