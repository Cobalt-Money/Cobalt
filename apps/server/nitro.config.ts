import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["workflow/nitro"],
  // Bundle all @cobalt-web/* workspace packages into the output
  noExternals: true,
  routes: { "/**": "./src/index.ts" },
  // Include knowledge .md files and db schema .ts files so fs.readFileSync works at runtime
  serverAssets: [
    { baseName: "knowledge", dir: "./src/ai/knowledge" },
    { baseName: "db-schema", dir: "../../packages/db/src" },
  ],
  vercel: {
    functions: {
      runtime: "bun1.x",
    },
  },
});
