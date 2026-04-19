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
    functions: {
      runtime: "nodejs22.x",
    },
  },
});
