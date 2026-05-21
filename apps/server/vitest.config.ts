import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./test-setup.ts"],
    server: {
      // @tanstack/ai-isolate-cloudflare 0.1.8 ships extensionless ESM imports
      // that Node's loader rejects under vitest. Inline-bundle through Vite so
      // its resolver patches the missing extensions. Production build uses
      // nitro w/ `noExternals: true` which already does this via rollup.
      deps: {
        inline: [/@tanstack\/ai-isolate-cloudflare/],
      },
    },
  },
});
