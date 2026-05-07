import { fileURLToPath } from "node:url";

import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["workflow/nitro"],
  noExternals: true,
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
    functionRules: {
      "/api/queues/snapshot-user": {
        experimentalTriggers: [{ topic: "snapshots", type: "queue/v2beta" }],
      },
    },
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
