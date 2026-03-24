import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/** Test config uses the same transforms as the app but omits TanStack Start (not needed for unit tests). */
export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), viteReact()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
