import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { evalite } from "evalite";

import { evalsEnabled } from "../../_shared/eval-gate.js";
import type { ColumnExpected } from "../../_shared/eval-scorers.js";
import { columnShapeScorer, columnStructuralValidity } from "../../_shared/eval-scorers.js";
import { runCsvColumnMappingAgent } from "./csv-column-mapping-agent.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(here, "csv-column-mapping-agent.fixtures.json");

interface Fixture {
  name: string;
  headers: string[];
  rows: Record<string, string>[];
  expected: ColumnExpected;
}

const run = evalsEnabled() ? evalite : evalite.skip;

run("CSV Column Mapping", {
  columns: ({ input, output }) => [
    { label: "Fixture", value: (input as { name: string }).name },
    { label: "amount.kind", value: output.amount.kind },
    { label: "date.kind", value: output.date.kind },
    { label: "merchant", value: output.merchant?.column ?? "" },
  ],
  data: async () => {
    const fixtures: Fixture[] = JSON.parse(await readFile(fixturesPath, "utf-8"));
    return fixtures.map((f) => ({
      expected: f.expected,
      input: { headers: f.headers, name: f.name, rows: f.rows },
    }));
  },
  scorers: [columnShapeScorer, columnStructuralValidity],
  task: async ({ headers, rows }) => await runCsvColumnMappingAgent({ headers, rows }),
});
