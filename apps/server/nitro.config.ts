import { cpSync, readdirSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "nitro";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Copy a node_modules package — and all of its transitive deps that bun's
 * isolated install grouped into the same store entry — into the Nitro
 * server output's node_modules directory, with all symlinks dereferenced.
 *
 * Vercel's `includeFiles` glob is unreliable here:
 *  - The glob is resolved from the project's filesystem root (= repo root in
 *    our monorepo, since no `rootDirectory` is set), so a glob like
 *    `node_modules/isolated-vm/**` finds nothing — the package only exists
 *    under `apps/server/node_modules/isolated-vm`, which is a bun symlink
 *    pointing into `node_modules/.bun/<pkg>@<ver>/node_modules/<pkg>`.
 *  - Even when matched, Vercel doesn't follow bun's isolated-install symlinks
 *    consistently, so the function ships a dangling link and ESM resolution
 *    fails with `ERR_MODULE_NOT_FOUND`.
 *
 * bun's isolated store layout: each package gets a directory at
 * `node_modules/.bun/<pkg>@<ver>/node_modules/`, and that directory contains
 * the package itself plus symlinks to its direct runtime deps. Resolving the
 * symlink at `apps/server/node_modules/<name>` gives us the package's real
 * path; its parent directory is the store entry, where all the package's
 * runtime deps also live as siblings. Copying that whole parent dereferences
 * everything the package needs at runtime.
 */
function copyPkgWithDeps(name: string, outputDir: string) {
  const symlink = resolve(here, "node_modules", name);
  const realPkgPath = realpathSync(symlink);
  // realPkgPath = .../node_modules/.bun/<pkg>@<ver>/node_modules/<name>
  // parent     = .../node_modules/.bun/<pkg>@<ver>/node_modules
  const storeNodeModules = dirname(realPkgPath);
  const destNodeModules = resolve(outputDir, "node_modules");
  for (const entry of readdirSync(storeNodeModules)) {
    cpSync(resolve(storeNodeModules, entry), resolve(destNodeModules, entry), {
      dereference: true,
      recursive: true,
    });
  }
}

export default defineConfig({
  hooks: {
    // Run after Vercel preset has written its full output (config.json,
    // .vc-config.json, function chunks). Use `close` instead of `compiled`
    // so the preset's own hook chain finishes first; then copy native
    // packages into the function bundle.
    close: () => {
      const out = resolve(here, ".vercel/output/functions/__server.func");
      copyPkgWithDeps("isolated-vm", out);
      copyPkgWithDeps("typescript", out);
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
