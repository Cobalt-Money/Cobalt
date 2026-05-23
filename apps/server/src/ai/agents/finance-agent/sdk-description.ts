/**
 * Single source of truth for the `cobalt.*` SDK surface description.
 * Consumed by both the MCP `cobalt_execute_code` tool and the internal
 * finance-agent's `executeCode` tool so their tool descriptions cannot drift.
 *
 * Keep this in sync with `bindings.ts` — every route bound there should be
 * documented here. Do not include sandbox/runtime details (those live with
 * each consumer since they vary by execution environment).
 */
export const COBALT_SDK_DESCRIPTION = [
  "Available APIs on `cobalt.*`:",
  "  Accounts (user-scoped):",
  "    - cobalt.accounts.list({ type?, subtype? }) — list the user's accounts. Each row: { id, name, type, subtype, mask, institutionName, currency, current, creditLimit }. `id` is the account id — pass it as `accountId` to cobalt.transactions.create. type ∈ depository|credit|loan|investment; subtype is pass-through string. Both filters optional.",
  "    - cobalt.accounts.getById({ accountId })",
  "    - cobalt.accounts.create({ name, type, subtype, currentBalance, currency?, creditLimit?, logoDomain? }) — create a MANUAL account. Strict: subtype must match type's vocabulary (all lowercase). depository: 'checking'|'savings'|'cash'. credit: 'credit card'|'line of credit'. investment: 'brokerage'|'ira'|'roth ira'|'401k'|'hsa'|'crypto'. loan: 'mortgage'|'student'|'auto'|'personal'. `currentBalance` is the opening balance; `creditLimit` only valid when `type === 'credit'`. `currency` defaults USD. Returns { id } — use it as `accountId` for cobalt.transactions.create.",
  "  Categories (user-scoped):",
  "    - cobalt.categories.list() — returns { categories, groups }; each category has { id, name, systemKey, groupId, iconKey, hidden, excludeFromInsights }. Match by `name` or `systemKey` (stable across users) to resolve `categoryId` for transactions.create / transactions.update.",
  "    - cobalt.categories.get({ categoryId }) — returns { category } or { category: null }.",
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
  "    - cobalt.transactions.create(rows[]) — bulk-insert manual transactions onto user-owned MANUAL accounts. Always pass an array (1–500 rows; wrap single insert in `[]`). Returns `{ ids: [...] }` in input order. All-or-nothing. Each row: { accountId, amount, date, name, categoryId?, currency?, id?, location?, merchantName?, notes?, website? }. Plaid-linked accounts reject. Sign follows Plaid (debit positive). `date` = YYYY-MM-DD. `currency` defaults USD. `location` locks the field against future syncs.",
  "    - cobalt.transactions.update({ transactionId, patch: { name?, date?, notes?, categoryId?, tags?, merchantName?, website?, location? } }) — patch only, cannot create. Pass `null` for name/date/notes/categoryId/merchantName/location to restore the original Plaid value. `location` is a composite { address, city, region, postal_code, country, lat, lon, store_number } object. `website` accepts a bare domain or full URL and is normalized to a bare lowercase domain. patch.tags is a FULL REPLACE of the tag set; to add or remove a single tag use cobalt.tags.addToTransaction / removeFromTransaction instead.",
  "  Research (global market data):",
  "    - cobalt.research.quote({ symbol })",
  "    - cobalt.research.overview({ symbol })",
  "    - cobalt.research.news({ symbol })",
  "User-scoped calls are automatically restricted to the authenticated user — sandboxed code cannot supply or override `userId`. Most APIs are read-only; accounts.create (manual accounts only), transactions.create, transactions.update, and the tags.* mutators are the writeable surface and require the `cobalt:write` OAuth scope.",
].join("\n");
