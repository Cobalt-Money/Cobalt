import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    // SPA mode: no SSR for the app shell. Zero does not support SSR; see ztunes README:
    // https://github.com/rocicorp/ztunes#tanstack-start
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    nitro({
      rollupConfig: {
        external: [
          "shiki",
          "@shikijs/core",
          "@shikijs/engine-oniguruma",
          "@shikijs/engine-javascript",
          "@streamdown/code",
          "@streamdown/cjk",
          "@streamdown/math",
          "@streamdown/mermaid",
          "streamdown",
          "tslib",
          "react",
          "react-dom",
        ],
      },
    }),
    viteReact(),
  ],
  /** Match dev port so auth / CORS lines up with `CORS_ORIGIN` (API stays on 3000). */
  preview: {
    port: 3001,
  },
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
  ssr: {
    external: [
      "shiki",
      "@shikijs/core",
      "@shikijs/engine-oniguruma",
      "@shikijs/engine-javascript",
      "@streamdown/code",
      "@streamdown/cjk",
      "@streamdown/math",
      "@streamdown/mermaid",
      "streamdown",
      "tslib",
      "react",
      "react-dom",
    ],
  },
});
