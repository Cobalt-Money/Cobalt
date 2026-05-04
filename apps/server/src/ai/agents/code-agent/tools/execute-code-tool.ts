import { tool } from "ai";
import { z } from "zod";

import { runCobaltCode } from "../code-runtime.js";

const description = [
  "Run JavaScript inside an ephemeral QuickJS sandbox with access to the Cobalt SDK as a `cobalt` global. Plain JavaScript only — TypeScript syntax (type annotations, interfaces, generics) is NOT supported and will fail to parse.",
  "Available APIs:",
  "  Accounts (user-scoped):",
  "    - cobalt.accounts.listAll() / listBank() / listCreditCards() / getById({ accountId })",
  "  Brokerage (user-scoped):",
  "    - cobalt.brokerage.balances() / accounts() / userBrokerages() / userTickers()",
  "    - cobalt.brokerage.positions({ accountId?, limit?, offset? })",
  "    - cobalt.brokerage.activities({ accountId?, limit?, offset? })",
  "    - cobalt.brokerage.portfolioSnapshots({ accountId?, startDate?, endDate? })",
  "  Snapshots (user-scoped):",
  "    - cobalt.snapshots.balances({ accountId?, startDate?, endDate? })",
  "  Tags (user-scoped):",
  "    - cobalt.tags.list() / get({ tagId })",
  "    - cobalt.tags.forTransaction({ transactionId })",
  "    - cobalt.tags.addToTransaction({ transactionId, tagIds })",
  "    - cobalt.tags.removeFromTransaction({ transactionId, tagIds })",
  "    - cobalt.tags.setOnTransaction({ transactionId, tagIds })",
  "  Transactions (user-scoped):",
  "    - cobalt.transactions.list({ startDate?, endDate?, primaryCategory?, accountType?, minAmount?, maxAmount?, searchQuery?, pendingFilter?, page?, pageSize? })",
  "    - cobalt.transactions.update({ transactionId, patch: { name?, date?, notes?, category?, tags?, userOverrideLocation? } })",
  "  Research (global market data):",
  "    - cobalt.research.quote({ symbol }) / overview / earningsHistory / earningsEstimates / incomeStatement / balanceSheet / news",
  "    - cobalt.research.timeSeries({ symbol, interval?, outputsize? })",
  "    - cobalt.research.intraday({ symbol, interval, extended_hours?, outputsize? })",
  "User-scoped calls are automatically restricted to the authenticated user. Use `console.log` to surface data and/or `return` a value from the script.",
  "The sandbox is ephemeral and limited to a 3-minute wall-clock budget. Most APIs are read-only; transactions.update is the only mutator and patches existing rows owned by the user.",
].join("\n");

export const createExecuteCodeTool = (userId: string) =>
  tool({
    description,
    execute: async ({ code }) => {
      const result = await runCobaltCode(userId, code);
      if (!result.ok) {
        return {
          error: result.error ?? { message: "code failed", name: "Error" },
          ok: false,
          stdout: result.stdout,
        };
      }
      return { ok: true, stdout: result.stdout };
    },
    inputSchema: z.object({
      code: z
        .string()
        .min(1)
        .describe(
          "JavaScript source (no TypeScript syntax). Top-level await is supported. `cobalt.*` is preinjected — do not import it.",
        ),
    }),
  });
