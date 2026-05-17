import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { evalite } from "evalite";

import { evalsEnabled } from "../../_shared/eval-gate.js";
import type { AccountExpected } from "../../_shared/eval-scorers.js";
import { accountDecisionScorer } from "../../_shared/eval-scorers.js";
import { runCsvAccountMappingAgent } from "./csv-account-mapping-agent.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(here, "csv-account-mapping-agent.fixtures.json");

interface Fixture {
  name: string;
  sourceLabels: string[];
  userAccounts: Parameters<typeof runCsvAccountMappingAgent>[0]["userAccounts"];
  expected: AccountExpected;
}

const run = evalsEnabled() ? evalite : evalite.skip;

run("CSV Account Mapping", {
  columns: ({ input, output }) => [
    { label: "Fixture", value: (input as { name: string }).name },
    { label: "Decisions", value: output.length },
    {
      label: "Sample",
      value: output
        .slice(0, 3)
        .map((d) => `${d.sourceLabel}→${d.target}`)
        .join(", "),
    },
  ],
  data: async () => {
    const fixtures: Fixture[] = JSON.parse(await readFile(fixturesPath, "utf-8"));
    return fixtures.map((f) => ({
      expected: f.expected,
      input: {
        name: f.name,
        sourceLabels: f.sourceLabels,
        userAccounts: f.userAccounts,
      },
    }));
  },
  scorers: [accountDecisionScorer],
  task: async ({ sourceLabels, userAccounts }) =>
    await runCsvAccountMappingAgent({ sourceLabels, userAccounts }),
});
