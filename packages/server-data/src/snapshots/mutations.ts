import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/banking/balances/balance";
import { snapshot } from "@cobalt-web/db/schema/banking/balances/snapshot";
import { financialAccount } from "@cobalt-web/db/schema/banking/financial-account";
import { and, eq, sql } from "drizzle-orm";

const BATCH_SIZE = 100;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Upserts a daily snapshot row per financial_account of a given provider for
 * a user. Reads the live `balance` row (kept current by sync) and writes one
 * `snapshot` row per (account, today). Idempotent — re-running for the same
 * day overwrites the row.
 */
async function upsertDailySnapshotsForSource(
  userId: string,
  source: "plaid" | "snaptrade"
): Promise<{ upserted: number }> {
  const snapshotDate = todayIso();

  const rows = await db
    .select({
      accountId: financialAccount.id,
      available: balance.available,
      buyingPower: balance.buyingPower,
      current: balance.current,
      isoCurrencyCode: balance.isoCurrencyCode,
      limit: balance.limit,
    })
    .from(financialAccount)
    .innerJoin(balance, eq(balance.accountId, financialAccount.id))
    .where(
      and(
        eq(financialAccount.userId, userId),
        eq(financialAccount.source, source)
      )
    );

  if (rows.length === 0) {
    return { upserted: 0 };
  }

  const inserts = rows.map((r) => ({
    accountId: r.accountId,
    available: r.available,
    buyingPower: r.buyingPower,
    current: r.current,
    isoCurrencyCode: r.isoCurrencyCode,
    limit: r.limit,
    snapshotDate,
    source,
    userId,
  }));

  for (let i = 0; i < inserts.length; i += BATCH_SIZE) {
    const batch = inserts.slice(i, i + BATCH_SIZE);
    await db
      .insert(snapshot)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          available: sql`excluded.available`,
          buyingPower: sql`excluded.buying_power`,
          current: sql`excluded.current`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          limit: sql`excluded.limit`,
        },
        target: [snapshot.accountId, snapshot.snapshotDate],
      });
  }

  return { upserted: inserts.length };
}

export async function upsertBankBalanceSnapshotsForUser(
  userId: string,
  _source: string
): Promise<{ upserted: number }> {
  return await upsertDailySnapshotsForSource(userId, "plaid");
}

export async function upsertSnapTradePortfolioSnapshotsForUser(
  userId: string,
  _source: string
): Promise<{ upserted: number }> {
  return await upsertDailySnapshotsForSource(userId, "snaptrade");
}

/**
 * Plaid investment accounts now share the unified `snapshot` table with
 * regular Plaid accounts; this function is retained for caller compatibility
 * but folds into the same plaid sweep — re-upserting today's row is harmless.
 */
export function upsertPlaidInvestmentSnapshotsForUser(
  _userId: string,
  _source: string
): Promise<{ upserted: number }> {
  return Promise.resolve({ upserted: 0 });
}
