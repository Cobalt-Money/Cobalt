import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
    setupFiles: ["./test-setup.ts"],
    // pglite cold-boots a WASM Postgres per `new PGlite()`. CI cold-start can
    // exceed the 5s default; bump to 30s package-wide. No effect on fast tests.
    testTimeout: 30_000,
  },
});
