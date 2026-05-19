import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { evalite } from "evalite";

import { evalsEnabled } from "../../_shared/eval-gate.js";
import type { CategoryExpected } from "../../_shared/eval-scorers.js";
import {
  categoryCreateHasNewCategory,
  categoryDecisionScorer,
  iconKeyReasonable,
} from "../../_shared/eval-scorers.js";
import { runCsvCategoryMappingAgent } from "./csv-category-mapping-agent.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(here, "csv-category-mapping-agent.fixtures.json");

interface Fixture {
  name: string;
  sourceLabels: string[];
  userCategories: Parameters<typeof runCsvCategoryMappingAgent>[0]["userCategories"];
  expected: CategoryExpected;
}

const run = evalsEnabled() ? evalite : evalite.skip;

run("CSV Category Mapping", {
  columns: ({ input, output }) => [
    { label: "Fixture", value: (input as { name: string }).name },
    { label: "Decisions", value: output.length },
    {
      label: "Actions",
      value: (() => {
        const counts: Record<string, number> = {};
        for (const d of output) {
          counts[d.action] = (counts[d.action] ?? 0) + 1;
        }
        return Object.entries(counts)
          .map(([k, v]) => `${k}:${v}`)
          .join(" ");
      })(),
    },
  ],
  data: async () => {
    const fixtures: Fixture[] = JSON.parse(await readFile(fixturesPath, "utf-8"));
    return fixtures.map((f) => ({
      expected: f.expected,
      input: { name: f.name, sourceLabels: f.sourceLabels, userCategories: f.userCategories },
    }));
  },
  scorers: [categoryDecisionScorer, categoryCreateHasNewCategory, iconKeyReasonable],
  task: async ({ sourceLabels, userCategories }) =>
    await runCsvCategoryMappingAgent({ sourceLabels, userCategories }),
});
