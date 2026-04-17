import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, vitest],
  ignorePatterns: [
    "apps/fumadocs/**",
    "apps/web/src/routes/**/$*.tsx",
    "**/routeTree.gen.ts",
    "**/zero-schema.gen.ts",
    "packages/ui/src/components/**",
    "**/drizzle-zero.config.ts",
    ".claude/worktrees/**",
  ],
  overrides: [
    {
      files: [
        "**/*.{test,spec}.{ts,tsx,js,jsx}",
        "**/__tests__/**/*.{ts,tsx,js,jsx}",
      ],
      plugins: ["vitest"],
      rules: {
        "vitest/no-importing-vitest-globals": "off",
        "vitest/prefer-called-once": "off",
        "vitest/prefer-describe-function-title": "off",
        "vitest/prefer-lowercase-title": "off",
      },
    },
  ],
  rules: {
    "@typescript-eslint/no-empty-object-type": "off",
    "func-style": "off",
    "no-barrel-file": "warn",
    "no-empty-interface": "off",
    "no-inline-comments": "off",
    "no-use-before-define": "off",
    "react-perf/jsx-no-new-function-as-prop": "off",
    "require-await": "error",
    "unicorn/explicit-length-check": "error",
    "vitest/no-importing-vitest-globals": "off",
    "vitest/prefer-called-once": "off",
    "vitest/prefer-describe-function-title": "off",
    "vitest/prefer-lowercase-title": "off",
  },
});
