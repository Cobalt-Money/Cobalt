import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, tanstack, vitest],
  ignorePatterns: [
    ".agents/**",
    "apps/fumadocs/**",
    "apps/web/src/routes/**/$*.tsx",
    "**/zero-schema.gen.ts",
    "packages/ui/src/components/**",
    "**/drizzle-zero.config.ts",
    // Drizzle introspect output — auto-generated, not hand-edited.
    "packages/db/src/migrations/schema.ts",
    "packages/db/src/migrations/relations.ts",
    ".claude/worktrees/**",
    "apps/raycast/**",
    "docs/**",
  ],
  overrides: [
    {
      // One-off data-import / ETL scripts. Style rules that hurt readability
      // in throwaway scripts (counters, callback main(), template concat) are
      // relaxed; correctness rules stay on.
      files: [
        "packages/db/scripts/**/*.{ts,tsx,js,jsx}",
        // SRI-352 merchant match engine — heavy decision tree with many tier
        // branches; same rule relaxations as ETL scripts.
        "packages/server-data/src/merchants/**/*.{ts,tsx,js,jsx}",
      ],
      rules: {
        "@typescript-eslint/no-non-null-assertion": "off",
        complexity: "off",
        eqeqeq: "off",
        "no-empty-function": "off",
        "no-eq-null": "off",
        "no-negated-condition": "off",
        "no-plusplus": "off",
        "no-promise-executor-return": "off",
        "no-shadow": "off",
        "no-unused-vars": "off",
        "prefer-destructuring": "off",
        "prefer-template": "off",
        "promise/avoid-new": "off",
        "promise/param-names": "off",
        "promise/prefer-await-to-callbacks": "off",
        "promise/prefer-await-to-then": "off",
        "require-await": "off",
        "sort-keys": "off",
        "unicorn/consistent-function-scoping": "off",
        "unicorn/no-array-reduce": "off",
        "unicorn/no-lonely-if": "off",
        "unicorn/no-negated-condition": "off",
      },
    },
    {
      // SQL lives in `packages/server-data/<domain>/{queries,mutations}.ts`.
      // Routes, workflows, cron, mcp, agents — anything under `apps/` — go
      // through the repo layer. Package internals (server-data, db, auth's
      // Better Auth adapter) are exempt because they own the db handle.
      files: ["apps/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                importNames: ["db"],
                message:
                  "Import `db` only inside packages/server-data/ or packages/db/. Routes/workflows should call repo functions from `@cobalt-web/server-data/<domain>/{queries,mutations}` instead.",
                name: "@cobalt-web/db",
              },
            ],
          },
        ],
      },
    },
    {
      files: [
        "**/*.{test,spec}.{ts,tsx,js,jsx}",
        "**/__tests__/**/*.{ts,tsx,js,jsx}",
        // Test infrastructure (spawn helpers, setup files) sits under
        // `tests/` alongside the suites it supports — relax the same rules.
        "**/tests/**/*.{ts,tsx,js,jsx}",
        "**/test-setup.ts",
      ],
      plugins: ["vitest"],
      rules: {
        // Vitest 3's typed-mock pattern uses `vi.mock(import("..."), ...)` and
        // `typeof import("...")` inside `importActual<...>()`; the formatter
        // rewrites string args to the `import(...)` form, which this rule then
        // flags as a type annotation. False positive in test contexts.
        "@typescript-eslint/consistent-type-imports": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "jest/max-expects": "off",
        "no-restricted-imports": "off",
        "vitest/max-expects": "off",
        "vitest/no-importing-vitest-globals": "off",
        "vitest/prefer-called-once": "off",
        "vitest/prefer-describe-function-title": "off",
        "vitest/prefer-lowercase-title": "off",
        // Explicit type params on `vi.fn(...)` regress on inferred mocks: forcing
        // a generic overrides vitest's inference and breaks `.mockResolvedValue`,
        // arg typing, etc. Let inference drive mock types in tests.
        "vitest/require-mock-type-parameters": "off",
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
    // require-unicode-regexp: ~100 pre-existing violations in main; pure
    // correctness for ASCII patterns + lint signal noise.  Re-enable in a
    // dedicated codemod pass.
    "require-unicode-regexp": "off",
    // jsx-a11y/control-has-associated-label: many pre-existing violations in
    // landing pages + email/marketing components; non-blocking style.
    "jsx-a11y/control-has-associated-label": "off",
    // The following rules trip on many pre-existing call sites surfaced when
    // pre-commit started running across the whole monorepo. Re-enable in a
    // dedicated cleanup pass — none of them block runtime correctness.
    "prefer-arrow-callback": "off",
    "react/no-object-type-as-default-prop": "off",
    "react/no-unstable-nested-components": "off",
    "unicorn/prefer-import-meta-properties": "off",
    "unicorn/consistent-function-scoping": "off",
    "jsdoc/require-throws-type": "off",
    "vitest/prefer-called-exactly-once-with": "off",
    "jsx-a11y/no-noninteractive-element-interactions": "off",
    "unicorn/explicit-length-check": "error",
    "vitest/no-importing-vitest-globals": "off",
    "vitest/prefer-called-once": "off",
    "vitest/prefer-describe-function-title": "off",
    "vitest/prefer-lowercase-title": "off",
  },
});
