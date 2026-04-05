import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  entry: "./src/index.ts",
  external: ["react", "react-dom"],
  format: "esm",
  noExternal: [/@cobalt-web\/.*/],
  outDir: "./dist",
});
