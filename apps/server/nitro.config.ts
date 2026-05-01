import { fileURLToPath } from "node:url";

import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["workflow/nitro"],
  noExternals: true,
  // isolated-vm is a native node addon (.node binary). Cannot be bundled —
  // mark it external at the rollup layer so Nitro emits a runtime require,
  // then ship the prebuilds dir w/ the function (vercel.functions.includeFiles).
  // node-gyp-build picks the right ABI at dlopen (abi127=node22, abi137=node24).
  // ts-blank-space depends on `typescript`. typescript's prebuilt bundle uses
  // both require() and top-level await, which Node can't disambiguate when
  // re-bundled into our ESM chunk (ERR_AMBIGUOUS_MODULE_SYNTAX). Keep it
  // external + ship via vercel.functions.includeFiles below.
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
      includeFiles: [
        "node_modules/isolated-vm/prebuilds/linux-x64/**/*.node",
        // typescript is external (rollupConfig.external above) — ship the
        // package so `import ts from "typescript"` (via ts-blank-space)
        // resolves at runtime in the Vercel function.
        "node_modules/typescript/**",
      ],
      runtime: "nodejs22.x",
    },
  },
  // workflow/nitro writes run state into .workflow-data/ on every step; keep
  // the dev watcher out or every workflow run triggers a rebuild storm.
  watchOptions: {
    ignored: ["**/.workflow-data/**", "**/.swc/**"],
  },
});
