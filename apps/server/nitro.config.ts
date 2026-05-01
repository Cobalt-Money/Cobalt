import { cpSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "nitro";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Copy a node_modules package into the Nitro server output's node_modules
 * directory, dereferencing bun's symlinked store so the package files (incl.
 * native .node binaries) physically live in the deployed function bundle.
 *
 * Vercel's `includeFiles` glob is unreliable for this case:
 *  - The glob is resolved from the project's filesystem root (= repo root in
 *    our monorepo, since no `rootDirectory` is set), so a glob like
 *    `node_modules/isolated-vm/**` finds nothing — the package only exists
 *    under `apps/server/node_modules/isolated-vm`, which is a bun symlink
 *    pointing into `node_modules/.bun/<pkg>@<ver>/...`.
 *  - Even when matched, Vercel doesn't follow bun's isolated-install symlinks
 *    consistently, so the function ships a dangling link and ESM resolution
 *    fails with `ERR_MODULE_NOT_FOUND: Cannot find package 'isolated-vm'`.
 * Copying the real files into `.output/server/node_modules/<pkg>` during the
 * Nitro `close` hook deposits them in the function bundle directly.
 */
function copyRealPkg(name: string, outputDir: string) {
  const srcSymlink = resolve(here, "node_modules", name);
  const real = realpathSync(srcSymlink);
  const dest = resolve(outputDir, "node_modules", name);
  cpSync(real, dest, { dereference: true, recursive: true });
}

export default defineConfig({
  hooks: {
    // Run after Vercel preset has written its full output (config.json,
    // .vc-config.json, function chunks). Use `close` instead of `compiled`
    // so the preset's own hook chain finishes first; then copy native
    // packages into the function bundle.
    close: () => {
      const out = resolve(here, ".vercel/output/functions/__server.func");
      copyRealPkg("isolated-vm", out);
      copyRealPkg("typescript", out);
    },
  },
  modules: ["workflow/nitro"],
  noExternals: true,
  // External at rollup layer so Nitro emits a runtime require/import instead
  // of bundling the package source. Required for:
  //  - isolated-vm: native .node binary, can't be bundled at all.
  //  - typescript: prebuilt lib uses both require() and top-level await,
  //    which Node refuses to disambiguate when re-bundled
  //    (ERR_AMBIGUOUS_MODULE_SYNTAX).
  // Both are then placed into `.vercel/output/functions/__server.func/node_modules/`
  // by the `close` hook above so resolution succeeds at runtime.
  rollupConfig: { external: ["isolated-vm", "typescript"] },
  routes: { "/**": "./src/index.ts" },
  serverAssets: [
    {
      baseName: "knowledge",
      dir: fileURLToPath(new URL("src/ai/knowledge", import.meta.url)),
    },
    {
      baseName: "db-schema",
      dir: fileURLToPath(new URL("../../packages/db/src", import.meta.url)),
    },
  ],
  vercel: {
    functions: {
      runtime: "nodejs22.x",
    },
  },
  // workflow/nitro writes run state into .workflow-data/ on every step; keep
  // the dev watcher out or every workflow run triggers a rebuild storm.
  watchOptions: {
    ignored: ["**/.workflow-data/**", "**/.swc/**"],
  },
});
