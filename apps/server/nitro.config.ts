import { defineConfig } from "nitro/config";

export default defineConfig({
  handlers: [{ handler: "./src/index.ts", route: "/**" }],
  modules: ["workflow/nitro"],
});
