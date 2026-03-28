# Static assets (web app)

Files here are served **as-is** from the site root (Vite `public/`).

| Path on disk                    | URL in the app            |
| ------------------------------- | ------------------------- |
| `public/assets/icons/…`         | `/assets/icons/…`         |
| `public/assets/vectors/…`       | `/assets/vectors/…`       |
| `public/assets/illustrations/…` | `/assets/illustrations/…` |

**Use this folder for:** favicons, PNG/WebP/SVG you reference by URL, large illustration sets, and anything you drop in without importing from `src/`.

**Prefer `src/` imports instead when:** you want hashed filenames, tree-shaking, or importing an SVG as a React component — put those under `apps/web/src/assets/` and `import` them.

**Naming:** use `kebab-case` filenames; keep a stable folder per feature (e.g. `icons/transactions/`) if the set grows large.
