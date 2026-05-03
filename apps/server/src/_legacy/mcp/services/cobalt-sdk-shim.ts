/**
 * Body of the Cobalt sandbox SDK. Defines a `cobalt` object that posts to the
 * bridge endpoint with the per-sandbox JWT injected via env. Two wrappers are
 * exported below so the same body can be injected as either an inline script
 * (MCP `execute_code` codeRun) or a proper ESM module (`cobalt.mjs` written
 * into a long-lived bash sandbox).
 *
 * Keep in sync with `agent-bridge/registry.ts` — every entry there should have
 * a matching accessor here.
 */
const SDK_BODY = `
const __BRIDGE_URL = process.env.BRIDGE_URL;
const __BRIDGE_TOKEN = process.env.BRIDGE_TOKEN;

if (!__BRIDGE_URL || !__BRIDGE_TOKEN) {
  throw new Error("cobalt sdk: BRIDGE_URL/BRIDGE_TOKEN missing in sandbox env");
}

async function __cobaltCall(route, args) {
  const res = await fetch(__BRIDGE_URL + "/api/agent-bridge/exec", {
    method: "POST",
    headers: {
      "authorization": "Bearer " + __BRIDGE_TOKEN,
      "content-type": "application/json",
    },
    body: JSON.stringify({ route, args: args ?? {} }),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { error: text }; }
  if (!res.ok || body.ok === false) {
    throw new Error("cobalt." + route + " failed (" + res.status + "): " + (body.error ?? text));
  }
  return body.data;
}

const COBALT_SDK = {
  accounts: {
    /** All Plaid-connected accounts with institution + balance. */
    listAll: () => __cobaltCall("accounts.listAll"),
    /** Depository accounts only. */
    listBank: () => __cobaltCall("accounts.listBank"),
    /** Credit card accounts only. */
    listCreditCards: () => __cobaltCall("accounts.listCreditCards"),
    /** @param args { accountId } — Plaid externalId. */
    getById: (args) => __cobaltCall("accounts.getById", args),
  },
  brokerage: {
    balances: () => __cobaltCall("brokerage.balances"),
    /** @param args { accountId?, limit?, offset? } */
    positions: (args) => __cobaltCall("brokerage.positions", args),
    /** @param args { accountId?, limit?, offset? } */
    activities: (args) => __cobaltCall("brokerage.activities", args),
    /** @param args { accountId?, startDate?, endDate? } — defaults last 6mo. */
    portfolioSnapshots: (args) =>
      __cobaltCall("brokerage.portfolioSnapshots", args),
    userBrokerages: () => __cobaltCall("brokerage.userBrokerages"),
    userTickers: () => __cobaltCall("brokerage.userTickers"),
    accounts: () => __cobaltCall("brokerage.accounts"),
  },
  snapshots: {
    /** @param args { accountId?, startDate?, endDate? } — daily balance snapshots. */
    balances: (args) => __cobaltCall("snapshots.balances", args),
  },
  tags: {
    list: () => __cobaltCall("tags.list"),
    /** @param args { tagId } */
    get: (args) => __cobaltCall("tags.get", args),
    /** @param args { transactionId } — returns current tagIds on the transaction. */
    forTransaction: (args) => __cobaltCall("tags.forTransaction", args),
    /** Merge tagIds onto a transaction without dropping existing tags.
     *  @param args { transactionId, tagIds } */
    addToTransaction: (args) => __cobaltCall("tags.addToTransaction", args),
    /** Remove tagIds from a transaction; other tags untouched.
     *  @param args { transactionId, tagIds } */
    removeFromTransaction: (args) =>
      __cobaltCall("tags.removeFromTransaction", args),
    /** Full replace of tagIds on a transaction (pass [] to clear).
     *  Prefer addToTransaction/removeFromTransaction unless you really mean replace.
     *  @param args { transactionId, tagIds } */
    setOnTransaction: (args) => __cobaltCall("tags.setOnTransaction", args),
  },
  research: {
    /** Global market data — not user-scoped. @param args { symbol } */
    quote: (args) => __cobaltCall("research.quote", args),
    overview: (args) => __cobaltCall("research.overview", args),
    news: (args) => __cobaltCall("research.news", args),
  },
  transactions: {
    /**
     * @param args { startDate?, endDate?, primaryCategory?, accountType?,
     *   minAmount?, maxAmount?, searchQuery?, pendingFilter?, page?, pageSize? }
     */
    list: (args) => __cobaltCall("transactions.list", args),
    /**
     * Patch an existing transaction owned by the user. Cannot create new
     * transactions. Sparse: only provided fields change.
     * @param args { transactionId, patch: { name?, date?, notes?, category?,
     *   tags?, userOverrideLocation? } }
     *   Pass null on a field to reset to its original value (except tags/location).
     *   WARNING: patch.tags is a FULL REPLACE of the transaction's tag set.
     *   To add or remove a single tag, prefer cobalt.tags.addToTransaction /
     *   removeFromTransaction so existing tags are preserved.
     */
    update: (args) => __cobaltCall("transactions.update", args),
  },
};
`;

/** Inline form: prepended to a single-shot script (MCP execute_code). */
export const COBALT_SDK_SHIM = `${SDK_BODY}\nconst cobalt = COBALT_SDK;\n`;
