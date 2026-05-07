# packages/ui

Shared React component library built with Shadcn, Tailwind CSS v4, and class-variance-authority.

## File Structure

```
src/
  components/       — All Shadcn UI components (every component is installed)
  cobalt/           — Multi-primitive compositions + product domain code (accounts, transactions, brokerage, news)
  hooks/            — Shared React hooks (use-mobile, etc.)
  lib/              — Utilities (cn/clsx helper, etc.)
  styles/
    globals.css     — Global Tailwind styles and theme
components.json     — Shadcn UI generation config (base-lyra style)
postcss.config.mjs  — PostCSS config
```

Every Shadcn component is available. Import any component directly — no need to install individually. Check `src/components/` for the full list or run `ls packages/ui/src/components/`.

## Conventions

- Import Shadcn components via `@cobalt-web/ui/components/*` (e.g., `@cobalt-web/ui/components/button`) — these are Cobalt-tuned. Always prefer these in app code.
- Import Cobalt compositions via `@cobalt-web/ui/cobalt/*` only for non-trivial multi-primitive wiring (e.g., `@cobalt-web/ui/cobalt/command-palette`)
- Import hooks via `@cobalt-web/ui/hooks/*`
- Import utilities via `@cobalt-web/ui/lib/*`
- Global styles are at `@cobalt-web/ui/globals.css`
- Uses `@base-ui/react` as the headless primitive layer

### Variants on tuned base components

- `Card` — `variant: default | subtle`. Subtle = ghost fill, no ring (use for dashboard/section panels).
- `Toggle` — `variant: default | outline | subtle`. Subtle = h-7, dashed muted border (use for filter chips).
- `Button` — no transition / press translate. Add motion only at callsite if needed.
- `Dialog` / `DialogContent` — top-anchored by default (`top-[max(6rem,13svh)]`), light scrim (`bg-black/60`), subtle popover bg, `shadow-2xl`, no ring, `flex flex-col` body. Pass `position="center"` for centered. Set `overlayClassName="bg-black/25 ..."` for the very-light command-palette scrim. Don't re-emit any of the baked defaults.
- `CommandDialog` — wraps `DialogContent` with command-palette tuning: `max-h-[min(55vh,35rem)] sm:max-w-2xl`, `rounded-3xl`, `bg-black/25` overlay, dark mode `bg-sidebar-accent`. Drop-in replacement for the deleted `CobaltCommandDialog`.
- `Command` — root cmdk container. Bakes group spacing, item radius/padding (`rounded-lg`, `px-4 py-3`), selected-item bg, list scrollbar hide, group heading typography. Drop-in replacement for the deleted `CobaltCommandPaletteRoot`.
- `CommandInput` — `variant: default | frameless`. `frameless` = no icon, no input-group box, larger text, `px-4 py-5` (Linear-style command palette search). Default keeps the search-icon input-group.

### Layout & display primitives — prefer over raw Tailwind

- **`HStack` / `VStack`** (`@cobalt-web/ui/components/stack`) — replaces `flex items-center gap-N` and `flex flex-col gap-N`. Props: `gap` (0/0.5/1/1.5/2/2.5/3/4/5/6/8/10/12), `align`, `justify`, `wrap`, `inline`. Use these by default for any flex container.
- **`PageHeader`** (`@cobalt-web/ui/components/page-header`) — `<PageHeader title="..." description="..." actions={<>...</>} size="default|sm|lg" />`. Use for every route-level header.
- **`Stat` / `StatValue`** (`@cobalt-web/ui/components/stat`) — numeric display with `tabular-nums`. Props: `label`, `value`, `delta`, `tone` (default/positive/negative/muted), `size` (sm/default/lg/xl). Use for any displayed number (balances, counts, percentages).
- **`Icon`** (`@cobalt-web/ui/components/icon`) — wraps `HugeiconsIcon` with `strokeWidth=2` default and named sizes (`xs`/`sm`/`default`/`md`/`lg`/`xl`). Use instead of raw `<HugeiconsIcon icon={X} className="size-4">`.

### Color tokens

All semantic color goes through CSS variables in `src/styles/globals.css`. Use Tailwind's token classes — do **not** use raw color scales (`text-red-600`, `text-green-500`, etc.) for status/state. Raw colors are reserved for chart palettes and brand artwork.

| Intent                                          | Token classes                                                 |
| ----------------------------------------------- | ------------------------------------------------------------- |
| Status: error / negative balance                | `text-destructive`, `bg-destructive/10`, `border-destructive` |
| Status: success / positive balance              | `text-success`, `bg-success/10`                               |
| Status: warning                                 | `text-warning`, `bg-warning/10`                               |
| Subtle panel surface (cards, popovers, dialogs) | `bg-popover`                                                  |
| Primary card                                    | `bg-card`                                                     |
| Hover/muted bg                                  | `bg-muted/40` (resting), `bg-muted/60` (hover)                |

`--popover` is the **subtle gray panel color** (light: `oklch(0.949 0 0)`, dark: `oklch(0.29 0 0)`). Used by base `Popover`, `Tooltip`, `Dialog`, `DropdownMenu`, `Card variant="subtle"`. Do not re-emit literal `bg-[oklch(0.949_0_0)]` — use `bg-popover`.

### Account category palette

Chart colors for net-worth / allocation buckets live in `src/lib/account-palette.ts` (`ACCOUNT_CATEGORY_COLORS`). Import there — do not duplicate hex values.

```ts
import { ACCOUNT_CATEGORY_COLORS } from "@cobalt-web/ui/lib/account-palette";
// { checking, credit, investments, loans, savings }
```

### Adding new Shadcn components

Use the Shadcn CLI or manually drop into `src/components/`. Base files in `components/*` are Cobalt-tuned — re-running `shadcn add <name>` on an already-tuned file will overwrite product styling. Diff before accepting.

## Cobalt design system (`src/cobalt/`)

Reserved for **multi-primitive compositions and product domain code** (accounts, transactions, brokerage, news). Single-primitive look-and-feel lives in `components/*` as variants. Examples that belong in `cobalt/`:

- **`CobaltDialog`** (form-shaped dialog with title icon + footer slots) — composes base `Dialog` + `DialogHeader` + `DialogTitle`. Visual chrome inherited from base; this is purely a shape composition.
- **Theming:** Components are authored for **both light and dark** (`dark:` where needed).
- **Backgrounds:** App shells should not rely on extra ambient gradient blobs behind content unless explicitly requested.

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
