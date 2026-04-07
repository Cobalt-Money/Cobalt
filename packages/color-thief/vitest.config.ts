import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- vite 8 / vitest 3 plugin type mismatch
  plugins: [viteReact()] as any,
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
