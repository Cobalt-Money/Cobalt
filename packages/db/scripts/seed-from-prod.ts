/**
 * Seed local DB with one user's full data graph from prod.
 *
 * Used by the SRI-264 unification work to test backfill against real-shape
 * data without needing sandbox connections.
 *
 * Run:
 *   DATABASE_URL=<prod-url> bun run packages/db/scripts/seed-from-prod.ts
 *
 * Reads from DATABASE_URL (prod), writes to a hardcoded local docker target.
 * Idempotent: ON CONFLICT DO NOTHING.
 */

import { Client } from "pg";
import type { FieldDef } from "pg";

const USER_ID = "xeKJ4ZVEldud5Q5EMdmTxFPL0kABhRA4";
const LOCAL_URL = "postgresql://postgres:postgres@127.0.0.1:5433/cobalt";
const BATCH = 500;

// DATABASE_URL may be a libpq DSN ("host=... user=...") or a postgres:// URL.
function parseConnection(
  s: string
): Record<string, string> | { connectionString: string } {
  if (s.startsWith("postgres://") || s.startsWith("postgresql://")) {
    return { connectionString: s };
  }
  const cfg: Record<string, string> = {};
  for (const part of s.split(/\s+/)) {
    const [k, v] = part.split("=", 2);
    if (k && v !== undefined) {
      cfg[k] = v;
    }
  }
  return {
    database: cfg.dbname,
    host: cfg.host,
    password: cfg.password,
    port: cfg.port ? Number(cfg.port) : 5432,
    ssl:
      cfg.sslmode === "verify-full" || cfg.sslmode === "require"
        ? { rejectUnauthorized: false }
        : undefined,
    user: cfg.user,
  } as unknown as Record<string, string>;
}

const prodCfg = parseConnection(process.env.DATABASE_URL ?? "");
const prod = new Client(prodCfg as never);
const local = new Client({ connectionString: LOCAL_URL });

async function copy(
  destTable: string,
  sql: string,
  params: unknown[] = []
): Promise<number> {
  const result = await prod.query(sql, params);
  const rows = result.rows as Record<string, unknown>[];
  const fields = result.fields as FieldDef[];
  if (rows.length === 0) {
    return 0;
  }
  const cols = fields.map((f) => `"${f.name}"`);
  const colList = cols.join(", ");
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const valueGroups = batch
      .map(
        (_, rowIdx) =>
          `(${fields
            .map((_f, colIdx) => `$${rowIdx * fields.length + colIdx + 1}`)
            .join(", ")})`
      )
      .join(", ");
    // pg returns jsonb/json columns as JS arrays/objects. Re-INSERT needs them
    // stringified, otherwise node-pg encodes JS arrays as postgres text-array
    // literals and the jsonb destination chokes on `{"a","b"}`.
    const JSON_OIDS = new Set([114, 3802]); // json, jsonb
    const flat = batch.flatMap((r) =>
      fields.map((f) => {
        const v = r[f.name];
        if (v === null || v === undefined) {
          return null;
        }
        if (JSON_OIDS.has(f.dataTypeID)) {
          return JSON.stringify(v);
        }
        return v;
      })
    );
    await local.query(
      `INSERT INTO ${destTable} (${colList}) VALUES ${valueGroups} ON CONFLICT DO NOTHING`,
      flat
    );
    inserted += batch.length;
  }
  return inserted;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to prod connection string");
  }
  await prod.connect();
  await local.connect();

  // eslint-disable-next-line no-console
  console.log(`Seeding local from prod for user ${USER_ID}\n`);

  await local.query("BEGIN");
  try {
    // Order: parents (with user_id directly) → children (joined through parent)
    const u = await copy(`"user"`, `SELECT * FROM "user" WHERE id = $1`, [
      USER_ID,
    ]);
    // eslint-disable-next-line no-console
    console.log(`  user                         ${u}`);

    // ---- Plaid hierarchy ----
    const bc = await copy(
      "bank_connection",
      `SELECT * FROM bank_connection WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  bank_connection              ${bc}`);

    const ba = await copy(
      "bank_account",
      `SELECT a.* FROM bank_account a
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  bank_account                 ${ba}`);

    const bb = await copy(
      "bank_balance",
      `SELECT bb.* FROM bank_balance bb
       JOIN bank_account a ON a.plaid_account_id = bb.plaid_account_id
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  bank_balance                 ${bb}`);

    const bbs = await copy(
      "bank_balance_snapshot",
      `SELECT bbs.* FROM bank_balance_snapshot bbs
       JOIN bank_account a ON a.plaid_account_id = bbs.plaid_account_id
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  bank_balance_snapshot        ${bbs}`);

    const txs = await copy(
      `"transaction"`,
      `SELECT t.* FROM "transaction" t
       JOIN bank_account a ON a.plaid_account_id = t.plaid_account_id
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  transaction                  ${txs}`);

    const rs = await copy(
      "recurring_stream",
      `SELECT rs.* FROM recurring_stream rs
       JOIN bank_account a ON a.plaid_account_id = rs.plaid_account_id
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  recurring_stream             ${rs}`);

    const cl = await copy(
      "credit_liability",
      `SELECT cl.* FROM credit_liability cl
       JOIN bank_account a ON a.plaid_account_id = cl.plaid_account_id
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  credit_liability             ${cl}`);

    // investment_security is referenced by positions; copy ones for this user
    const isec = await copy(
      "investment_security",
      `SELECT DISTINCT isec.* FROM investment_security isec
       JOIN investment_position ip ON ip.security_id = isec.security_id
       JOIN bank_account a ON a.plaid_account_id = ip.plaid_account_id
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  investment_security          ${isec}`);

    const ip = await copy(
      "investment_position",
      `SELECT ip.* FROM investment_position ip
       JOIN bank_account a ON a.plaid_account_id = ip.plaid_account_id
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  investment_position          ${ip}`);

    const ia = await copy(
      "investment_activity",
      `SELECT ia.* FROM investment_activity ia
       JOIN bank_account a ON a.plaid_account_id = ia.plaid_account_id
       JOIN bank_connection bc ON bc.plaid_item_id = a.plaid_item_id
       WHERE bc.user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  investment_activity          ${ia}`);

    // ---- SnapTrade hierarchy (all tables have user_id directly) ----
    const bu = await copy(
      "brokerage_user",
      `SELECT * FROM brokerage_user WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  brokerage_user               ${bu}`);

    const bauth = await copy(
      "brokerage_authorization",
      `SELECT * FROM brokerage_authorization WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  brokerage_authorization      ${bauth}`);

    const bacct = await copy(
      "brokerage_account",
      `SELECT * FROM brokerage_account WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  brokerage_account            ${bacct}`);

    const bad = await copy(
      "brokerage_account_detail",
      `SELECT * FROM brokerage_account_detail WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  brokerage_account_detail     ${bad}`);

    const brb = await copy(
      "brokerage_balance",
      `SELECT * FROM brokerage_balance WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  brokerage_balance            ${brb}`);

    const bp = await copy(
      "brokerage_position",
      `SELECT * FROM brokerage_position WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  brokerage_position           ${bp}`);

    const bact = await copy(
      "brokerage_activity",
      `SELECT * FROM brokerage_activity WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  brokerage_activity           ${bact}`);

    const bo = await copy(
      "brokerage_order",
      `SELECT * FROM brokerage_order WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  brokerage_order              ${bo}`);

    const ps = await copy(
      "portfolio_snapshot",
      `SELECT * FROM portfolio_snapshot WHERE user_id = $1`,
      [USER_ID]
    );
    // eslint-disable-next-line no-console
    console.log(`  portfolio_snapshot           ${ps}`);

    await local.query("COMMIT");
    // eslint-disable-next-line no-console
    console.log(`\nDone.`);
  } catch (error) {
    await local.query("ROLLBACK");
    throw error;
  } finally {
    await prod.end();
    await local.end();
  }
}

try {
  await main();
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
}
