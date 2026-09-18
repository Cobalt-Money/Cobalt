import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

// Preserve the existing formatter defaults and exclusions during the upgrade.
export default defineConfig({
  ...ultracite,
  printWidth: 100,
  proseWrap: "preserve",
  sortImports: false,
  sortTailwindcss: false,
  trailingComma: "all",
  ignorePatterns: [
    ".agents/**",
    "apps/fumadocs/**",
    "apps/web/src/routes/**/$*.tsx",
    "**/routeTree.gen.ts",
    "**/zero-schema.gen.ts",
    "packages/ui/src/components/**",
    "**/drizzle-zero.config.ts",
    ".claude/worktrees/**",
    "apps/raycast/**",
    "docs/**",
    "apps/server/openapi.json",
  ],
});
