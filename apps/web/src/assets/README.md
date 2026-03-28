# Bundled assets (imported)

Use this directory when you **`import`** files so Vite can hash them and include them in the bundle.

- **SVG as components:** often colocated next to the feature or under `src/assets/vectors/`.
- **Small PNG/WebP:** `import logo from '@/assets/…'` then `<img src={logo} alt="…" />`.

For many loose files referenced only by URL, prefer `public/assets/` instead (see `public/assets/README.md`).
