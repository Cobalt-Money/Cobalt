import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";
export default defineConfig({
  extends: [ultracite],
  ignorePatterns: [
    ".agents/**",
    "apps/fumadocs/**",
    "apps/web/src/routes/**/$*.tsx",
    "**/routeTree.gen.ts",
    "**/zero-schema.gen.ts",
    "packages/ui/src/components/**",
    "**/drizzle-zero.config.ts",
    ".claude/worktrees/**",
  ],
});
