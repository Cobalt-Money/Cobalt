import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/** Skip `.sandbox` so tsconfig-paths does not parse sample apps (e.g. Expo) that extend missing packages. */
const tsconfigPathsPlugin = tsconfigPaths({
  skip: (dir) => dir === ".sandbox",
});

/** Test config uses the same transforms as the app but omits TanStack Start (not needed for unit tests). */
export default defineConfig({
  plugins: [tsconfigPathsPlugin, tailwindcss(), viteReact()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
