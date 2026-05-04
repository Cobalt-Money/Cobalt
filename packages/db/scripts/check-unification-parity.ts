/**
 * SRI-264 Unification Parity Check
 *
 * Verifies that every old-schema row has a corresponding new-schema row after
 * Migration B (backfill). Used:
 *   - locally after `bun db:migrate:local`
 *   - on a PlanetScale branch after backfill
 *   - in CI as the cutover gate
 *   - continuously during the dual-write soak
 *
 * Exit code 0 = parity OK, 1 = drift detected.
 *
 * Run: bun run packages/db/scripts/check-unification-parity.ts
 */

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.LOCAL_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
});

interface Check {
  name: string;
  oldQuery: string;
  newQuery: string;
}

const COUNT_CHECKS: Check[] = [
  {
    name: "plaid bank accounts",
    newQuery: `SELECT COUNT(*)::int AS n FROM financial_account WHERE source = 'plaid'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM bank_account`,
  },
  {
    name: "snaptrade brokerage accounts",
    newQuery: `SELECT COUNT(*)::int AS n FROM financial_account WHERE source = 'snaptrade'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM brokerage_account`,
  },
  {
    name: "plaid bank balances",
    newQuery: `SELECT COUNT(*)::int AS n FROM balance b JOIN financial_account fa ON fa.id = b.account_id WHERE fa.source = 'plaid'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM bank_balance`,
  },
  {
    name: "snaptrade brokerage balances",
    newQuery: `SELECT COUNT(*)::int AS n FROM balance b JOIN financial_account fa ON fa.id = b.account_id WHERE fa.source = 'snaptrade'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM brokerage_balance`,
  },
  {
    name: "plaid balance snapshots",
    newQuery: `SELECT COUNT(*)::int AS n FROM snapshot WHERE source = 'plaid'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM bank_balance_snapshot`,
  },
  {
    name: "snaptrade portfolio snapshots",
    newQuery: `SELECT COUNT(*)::int AS n FROM snapshot WHERE source = 'snaptrade'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM portfolio_snapshot ps WHERE EXISTS (SELECT 1 FROM brokerage_account ba WHERE ba.id::text = ps.account_id)`,
  },
  {
    name: "snaptrade brokerage orders",
    newQuery: `SELECT COUNT(*)::int AS n FROM orders`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM brokerage_order`,
  },
  {
    name: "plaid securities",
    newQuery: `SELECT COUNT(*)::int AS n FROM security WHERE source = 'plaid'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM investment_security`,
  },
  {
    name: "plaid investment positions",
    newQuery: `SELECT COUNT(*)::int AS n FROM holding WHERE source = 'plaid'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM investment_position`,
  },
  {
    name: "snaptrade brokerage positions (deduped)",
    newQuery: `SELECT COUNT(*)::int AS n FROM holding WHERE source = 'snaptrade'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM (SELECT DISTINCT account_id, symbol_id FROM brokerage_position WHERE symbol_id IS NOT NULL) sub`,
  },
  {
    name: "plaid investment activities",
    newQuery: `SELECT COUNT(*)::int AS n FROM investment_activity_v2 WHERE source = 'plaid'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM investment_activity`,
  },
  {
    name: "snaptrade brokerage activities",
    newQuery: `SELECT COUNT(*)::int AS n FROM investment_activity_v2 WHERE source = 'snaptrade'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM brokerage_activity`,
  },
  {
    name: "plaid bank transactions",
    newQuery: `SELECT COUNT(*)::int AS n FROM transaction_v2 WHERE source = 'plaid'`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM transaction`,
  },
  {
    name: "recurring streams",
    newQuery: `SELECT COUNT(*)::int AS n FROM recurring_stream_v2`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM recurring_stream`,
  },
  {
    name: "credit liabilities",
    newQuery: `SELECT COUNT(*)::int AS n FROM credit_liability_v2`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM credit_liability`,
  },
  {
    name: "mortgage liabilities",
    newQuery: `SELECT COUNT(*)::int AS n FROM mortgage_liability_v2`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM mortgage_liability`,
  },
  {
    name: "student loan liabilities",
    newQuery: `SELECT COUNT(*)::int AS n FROM student_loan_liability_v2`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM student_loan_liability`,
  },
  {
    name: "plaid connections",
    newQuery: `SELECT COUNT(*)::int AS n FROM plaid_connection`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM bank_connection`,
  },
  {
    name: "snaptrade authorizations",
    newQuery: `SELECT COUNT(*)::int AS n FROM snaptrade_authorization`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM brokerage_authorization`,
  },
  {
    name: "snaptrade users",
    newQuery: `SELECT COUNT(*)::int AS n FROM snaptrade_user`,
    oldQuery: `SELECT COUNT(*)::int AS n FROM brokerage_user`,
  },
];

/**
 * Loss checks: prove every old-table row has a matching new-table row.
 * The JOIN must be through the unification key (plaid_account_id /
 * brokerage_account.account_id → financial_account.external_id).
 */
const LOSS_CHECKS: { name: string; query: string }[] = [
  {
    name: "bank_account → financial_account",
    query: `
      SELECT COUNT(*)::int AS missing FROM bank_account ba
      WHERE NOT EXISTS (
        SELECT 1 FROM financial_account fa
        WHERE fa.source = 'plaid' AND fa.external_id = ba.plaid_account_id
      )
    `,
  },
  {
    name: "brokerage_account → financial_account",
    query: `
      SELECT COUNT(*)::int AS missing FROM brokerage_account ba
      WHERE NOT EXISTS (
        SELECT 1 FROM financial_account fa
        WHERE fa.source = 'snaptrade' AND fa.external_id = ba.account_id
      )
    `,
  },
  {
    name: "transaction → transaction_v2",
    query: `
      SELECT COUNT(*)::int AS missing FROM transaction t
      WHERE NOT EXISTS (
        SELECT 1 FROM transaction_v2 tv
        WHERE tv.source = 'plaid' AND tv.external_id = t.plaid_transaction_id
      )
    `,
  },
  {
    name: "investment_activity → investment_activity_v2",
    query: `
      SELECT COUNT(*)::int AS missing FROM investment_activity ia
      WHERE NOT EXISTS (
        SELECT 1 FROM investment_activity_v2 iv
        WHERE iv.source = 'plaid' AND iv.external_id = ia.investment_transaction_id
      )
    `,
  },
  {
    name: "brokerage_activity → investment_activity_v2",
    query: `
      SELECT COUNT(*)::int AS missing FROM brokerage_activity bact
      WHERE NOT EXISTS (
        SELECT 1 FROM investment_activity_v2 iv
        WHERE iv.source = 'snaptrade' AND iv.external_id = bact.activity_id
      )
    `,
  },
  {
    name: "investment_position → holding",
    query: `
      SELECT COUNT(*)::int AS missing FROM investment_position ip
      WHERE NOT EXISTS (
        SELECT 1 FROM holding h
        JOIN financial_account fa ON fa.id = h.account_id
        WHERE fa.source = 'plaid' AND fa.external_id = ip.plaid_account_id
          AND h.source = 'plaid'
      )
    `,
  },
  {
    name: "recurring_stream → recurring_stream_v2",
    query: `
      SELECT COUNT(*)::int AS missing FROM recurring_stream rs
      WHERE NOT EXISTS (
        SELECT 1 FROM recurring_stream_v2 rv
        WHERE rv.source = 'plaid' AND rv.external_id = rs.stream_id
      )
    `,
  },
];

interface Result {
  name: string;
  status: "PASS" | "FAIL";
  detail: string;
}

async function runCount(check: Check): Promise<Result> {
  const [oldRes, newRes] = await Promise.all([
    pool.query<{ n: number }>(check.oldQuery),
    pool.query<{ n: number }>(check.newQuery),
  ]);
  const oldN = oldRes.rows[0]?.n ?? 0;
  const newN = newRes.rows[0]?.n ?? 0;
  const status: "PASS" | "FAIL" = oldN === newN ? "PASS" : "FAIL";
  return {
    detail: `old=${oldN} new=${newN}${status === "FAIL" ? ` Δ=${newN - oldN}` : ""}`,
    name: check.name,
    status,
  };
}

async function runLoss(c: { name: string; query: string }): Promise<Result> {
  const res = await pool.query<{ missing: number }>(c.query);
  const missing = res.rows[0]?.missing ?? 0;
  return {
    detail: `${missing} orphaned old row(s)`,
    name: c.name,
    status: missing === 0 ? "PASS" : "FAIL",
  };
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log("\n=== SRI-264 unification parity check ===\n");

  // eslint-disable-next-line no-console
  console.log("[1/2] Per-table count parity");
  const countResults = await Promise.all(COUNT_CHECKS.map(runCount));
  for (const r of countResults) {
    // eslint-disable-next-line no-console
    console.log(`  ${r.status === "PASS" ? "✓" : "✗"} ${r.name.padEnd(40)} ${r.detail}`);
  }

  // eslint-disable-next-line no-console
  console.log("\n[2/2] Post-backfill loss check");
  const lossResults = await Promise.all(LOSS_CHECKS.map(runLoss));
  for (const r of lossResults) {
    // eslint-disable-next-line no-console
    console.log(`  ${r.status === "PASS" ? "✓" : "✗"} ${r.name.padEnd(50)} ${r.detail}`);
  }

  const allResults = [...countResults, ...lossResults];
  const failed = allResults.filter((r) => r.status === "FAIL");

  // eslint-disable-next-line no-console
  console.log(
    `\n=== ${failed.length === 0 ? "PASS" : "FAIL"}: ${allResults.length - failed.length}/${allResults.length} checks green ===\n`,
  );

  await pool.end();
  process.exit(failed.length === 0 ? 0 : 1);
}

try {
  await main();
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.error("parity check crashed:", error);
  await pool.end();
  process.exit(2);
}
