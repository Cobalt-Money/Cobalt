import { defineConfig } from "oxlint";
import shadcn from "ultracite/oxlint/shadcn";

import base from "./oxlint.config.ts";

// Opt-in strict audit while existing screens adopt design-system contracts.
export default defineConfig({
  extends: [shadcn],
  categories: { correctness: "off" },
  ignorePatterns: base.ignorePatterns,
  jsPlugins: shadcn.jsPlugins,
  settings: base.settings,
  overrides: [
    {
      // These names are selector hooks used by the calendar's parent classes.
      files: ["apps/web/src/components/ui/day-picker.tsx"],
      rules: {
        "shadcn/no-unknown-classes": ["error", { allow: ["day-outside", "day-range-end"] }],
      },
    },
    {
      // Defined in the landing route's inline stylesheet, outside theme discovery.
      files: ["apps/web/src/components/landing/surfaces/cursor-visual.tsx"],
      rules: { "shadcn/no-unknown-classes": ["error", { allow: ["font-display"] }] },
    },
    {
      // cn() unit tests deliberately merge synthetic, non-Tailwind class names.
      files: ["packages/ui/src/lib/utils.test.ts"],
      rules: { "shadcn/no-unknown-classes": "off" },
    },
  ],
});
