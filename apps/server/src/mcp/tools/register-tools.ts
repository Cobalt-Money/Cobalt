import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { executeCode } from "./execute-code.js";

export function registerMcpTools(server: McpServer, userId: string): void {
  server.registerTool(
    "cobalt_get_session_subject",
    {
      annotations: { destructiveHint: false, readOnlyHint: true },
      description:
        "Returns the Cobalt user id (`sub`) for the current OAuth access token.",
      inputSchema: z.object({}),
      title: "Session subject",
    },
    () => ({
      content: [
        { text: JSON.stringify({ sub: userId }), type: "text" as const },
      ],
    })
  );

  server.registerTool(
    "cobalt_execute_code",
    {
      annotations: { destructiveHint: false, readOnlyHint: false },
      description: [
        "Run JavaScript or TypeScript inside an ephemeral V8 isolate sandbox with access to the Cobalt SDK as a `cobalt` global. TS types are stripped before exec (no type-check, syntax only) — annotations, interfaces, generics, and `as` casts are all fine. Imports/requires are NOT available; everything you need is on `cobalt.*`.",
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
        "    - cobalt.tags.forTransaction({ transactionId }) — current tagIds on a transaction",
        "    - cobalt.tags.addToTransaction({ transactionId, tagIds }) — merge (preserves existing)",
        "    - cobalt.tags.removeFromTransaction({ transactionId, tagIds })",
        "    - cobalt.tags.setOnTransaction({ transactionId, tagIds }) — full replace; pass [] to clear",
        "  Transactions (user-scoped):",
        "    - cobalt.transactions.list({ startDate?, endDate?, primaryCategory?, accountType?, minAmount?, maxAmount?, searchQuery?, pendingFilter?, page?, pageSize? })",
        "    - cobalt.transactions.update({ transactionId, patch: { name?, date?, notes?, category?, tags?, userOverrideLocation? } }) — patch only, cannot create. patch.tags is a FULL REPLACE of the tag set; to add or remove a single tag use cobalt.tags.addToTransaction / removeFromTransaction instead.",
        "  Research (global market data):",
        "    - cobalt.research.quote({ symbol }) / overview / earningsHistory / earningsEstimates / incomeStatement / balanceSheet / news",
        "    - cobalt.research.timeSeries({ symbol, interval?, outputsize? })",
        "    - cobalt.research.intraday({ symbol, interval, extended_hours?, outputsize? })",
        "User-scoped calls are automatically restricted to the authenticated user. Use `console.log` to return data; the script's stdout is what you receive.",
        "The sandbox is ephemeral and limited to a 3-minute wall-clock budget. Most APIs are read-only; transactions.update is the only mutator and patches existing rows owned by the user.",
      ].join("\n"),
      inputSchema: z.object({
        code: z
          .string()
          .min(1)
          .describe(
            "JavaScript source (no TypeScript syntax). Top-level await is supported. `cobalt.*` is preinjected — do not import it."
          ),
      }),
      title: "Execute code",
    },
    ({ code }) => executeCode(userId, code)
  );
}
