/**
 * Single source of truth for the `cobalt.*` SDK surface description.
 * Consumed by both the MCP `cobalt_execute_code` tool and the internal
 * code-agent's `executeCode` tool so their tool descriptions cannot drift.
 *
 * Keep this in sync with `bindings.ts` — every route bound there should be
 * documented here. Do not include sandbox/runtime details (those live with
 * each consumer since they vary by execution environment).
 */
export const COBALT_SDK_DESCRIPTION = [
  "Available APIs on `cobalt.*`:",
  "  Accounts (user-scoped):",
  "    - cobalt.accounts.list({ type?, subtype? }) — Plaid type ('depository'|'credit'|'loan'|'investment'|'other') and/or subtype ('checking'|'savings'|'mortgage'|'401k'|...). Both pass-through strings, omit for all. SnapTrade brokerage data is under cobalt.brokerage.accounts().",
  "    - cobalt.accounts.getById({ accountId })",
  "  Brokerage (user-scoped):",
  "    - cobalt.brokerage.balances() / accounts() / userBrokerages() / userTickers()",
  "    - cobalt.brokerage.positions({ accountId?, limit?, offset? })",
  "    - cobalt.brokerage.activities({ accountId?, limit?, offset? })",
  "    - cobalt.brokerage.portfolioSnapshots({ accountId?, startDate?, endDate? })",
  "  Snapshots (user-scoped):",
  "    - cobalt.snapshots.balances({ accountId?, startDate?, endDate? })",
  "  Tags (user-scoped):",
  "    - cobalt.tags.list() / get({ tagId })",
  "    - cobalt.tags.create({ name, color }) — returns { id }",
  "    - cobalt.tags.update({ tagId, patch: { name?, color?, archived? } }) — `archived: true` is soft delete (hidden from picker, history preserved). Hard delete is not exposed.",
  "    - cobalt.tags.forTransaction({ transactionId }) — current tagIds on a transaction",
  "    - cobalt.tags.addToTransaction({ transactionId, tagIds }) — merge (preserves existing)",
  "    - cobalt.tags.removeFromTransaction({ transactionId, tagIds })",
  "    - cobalt.tags.setOnTransaction({ transactionId, tagIds }) — full replace; pass [] to clear",
  "  Transactions (user-scoped):",
  "    - cobalt.transactions.list({ startDate?, endDate?, primaryCategory?, accountType?, minAmount?, maxAmount?, searchQuery?, pendingFilter?, limit?, cursor? }) — returns { transactions, nextCursor, hasMore }; pass `nextCursor` back as `cursor` for the next page",
  "    - cobalt.transactions.update({ transactionId, patch: { name?, date?, notes?, categoryId?, tags?, merchantName?, website?, location? } }) — patch only, cannot create. Pass `null` for name/date/notes/categoryId/merchantName/location to restore the original Plaid value. `location` is a composite { address, city, region, postal_code, country, lat, lon, store_number } object. `website` accepts a bare domain or full URL and is normalized to a bare lowercase domain. patch.tags is a FULL REPLACE of the tag set; to add or remove a single tag use cobalt.tags.addToTransaction / removeFromTransaction instead.",
  "  Research (global market data):",
  "    - cobalt.research.quote({ symbol })",
  "    - cobalt.research.overview({ symbol })",
  "    - cobalt.research.news({ symbol })",
  "User-scoped calls are automatically restricted to the authenticated user — sandboxed code cannot supply or override `userId`. Most APIs are read-only; transactions.update is the primary mutator.",
].join("\n");
