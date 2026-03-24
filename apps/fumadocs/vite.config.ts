import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

import { fumadocsOpenAPI } from "./plugins/vite-openapi-docs";

export default defineConfig({
  plugins: [
    fumadocsOpenAPI({
      input: "../server/openapi.json",
      output: "./content/docs/api-reference",
      per: "operation",
    }),
    mdx(await import("./source.config")),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    react(),
    // please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro for guides on hosting
    nitro({
      preset: "vercel",
    }),
  ],
  resolve: {
    alias: {
      tslib: "tslib/tslib.es6.js",
    },
    tsconfigPaths: true,
  },
  server: {
    port: 4000,
  },
});
