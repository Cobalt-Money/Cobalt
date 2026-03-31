import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/** Only scan this app’s tsconfig(s); do not walk the monorepo root (avoids `.sandbox`, etc.). */
const tsconfigPathsPlugin = tsconfigPaths({ root: "." });

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
