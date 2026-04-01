import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/** Only scan this app’s tsconfig(s); do not walk the monorepo root (avoids `.sandbox`, etc.). */
const tsconfigPathsPlugin = tsconfigPaths({ root: "." });

/** Test config uses the same transforms as the app but omits TanStack Start (not needed for unit tests). */
export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite 8 / vitest 3 plugin type mismatch
  plugins: [tsconfigPathsPlugin, tailwindcss(), viteReact()] as any,
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
