import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/** Skip `.sandbox` so tsconfig-paths does not parse sample apps (e.g. Expo) that extend missing packages. */
const tsconfigPathsPlugin = tsconfigPaths({
  skip: (dir) => dir === ".sandbox",
});

export default defineConfig({
  plugins: [
    tsconfigPathsPlugin,
    tailwindcss(),
    // SPA mode: no SSR for the app shell. Zero does not support SSR; see ztunes README:
    // https://github.com/rocicorp/ztunes#tanstack-start
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
    nitro(),
    viteReact(),
  ],
  /** Match dev port so auth / CORS lines up with `CORS_ORIGIN` (API stays on 3000). */
  preview: {
    port: 3001,
  },
  server: {
    port: 3001,
  },
});
