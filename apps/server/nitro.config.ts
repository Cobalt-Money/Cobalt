import { defineConfig } from "nitro";

export default defineConfig({
  modules: ["workflow/nitro"],
  // Bundle all @cobalt-web/* workspace packages into the output
  noExternals: true,
  routes: { "/**": "./src/index.ts" },
  vercel: {
    functions: {
      runtime: "nodejs22.x",
    },
  },
});
