import { db } from "@cobalt-web/db";
import { snapshot } from "@cobalt-web/db/schema/accounts/snapshot";
import { sql } from "drizzle-orm";

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

  const accounts = await db.query.financialAccount.findMany({
    columns: { id: true },
    where: {
      source: { eq: source },
      userId: { eq: userId },
    },
    with: {
      balance: {
        columns: {
          available: true,
          buyingPower: true,
          creditLimit: true,
          currency: true,
          current: true,
        },
      },
    },
  });
  const rows = accounts.flatMap((a) => {
    const b = a.balance;
    if (!b) {
      return [];
    }
    return [
      {
        accountId: a.id,
        available: b.available,
        buyingPower: b.buyingPower,
        creditLimit: b.creditLimit,
        currency: b.currency,
        current: b.current,
      },
    ];
  });

  if (rows.length === 0) {
    return { upserted: 0 };
  }

  const inserts = rows.map((r) => ({
    accountId: r.accountId,
    available: r.available,
    buyingPower: r.buyingPower,
    creditLimit: r.creditLimit,
    currency: r.currency,
    current: r.current,
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
          creditLimit: sql`excluded.credit_limit`,
          currency: sql`excluded.currency`,
          current: sql`excluded.current`,
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
