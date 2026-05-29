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
 *
 * Sign convention is normalized at ingestion: liabilities (credit / loan)
 * already store negative `current` in the `balance` row, so this writer is a
 * direct copy — net-worth math is a plain SUM.
 */
async function upsertDailySnapshotsForSource(
  userId: string,
  source: "plaid" | "snaptrade" | "manual",
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
    // For SnapTrade, `current` is the full account market value and
    // `available` is uninvested cash; positions value = current - cash.
    // Plaid bank/credit accounts don't carry a positions component.
    let positionsValue: string | null = null;
    if (source === "snaptrade") {
      const total = Number.parseFloat(b.current);
      const cash = b.available === null ? 0 : Number.parseFloat(b.available);
      const diff = total - cash;
      if (Number.isFinite(diff)) {
        positionsValue = diff.toFixed(4);
      }
    }
    return [
      {
        accountId: a.id,
        available: b.available,
        buyingPower: b.buyingPower,
        creditLimit: b.creditLimit,
        currency: b.currency,
        current: b.current,
        positionsValue,
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
    positionsValue: r.positionsValue,
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
          positionsValue: sql`excluded.positions_value`,
        },
        target: [snapshot.accountId, snapshot.snapshotDate],
      });
  }

  return { upserted: inserts.length };
}

export async function upsertBankBalanceSnapshotsForUser(
  userId: string,
  _source: string,
): Promise<{ upserted: number }> {
  return await upsertDailySnapshotsForSource(userId, "plaid");
}

export async function upsertSnapTradePortfolioSnapshotsForUser(
  userId: string,
  _source: string,
): Promise<{ upserted: number }> {
  return await upsertDailySnapshotsForSource(userId, "snaptrade");
}

export async function upsertManualBalanceSnapshotsForUser(
  userId: string,
  _source: string,
): Promise<{ upserted: number }> {
  return await upsertDailySnapshotsForSource(userId, "manual");
}

/**
 * Plaid investment accounts now share the unified `snapshot` table with
 * regular Plaid accounts; this function is retained for caller compatibility
 * but folds into the same plaid sweep — re-upserting today's row is harmless.
 */
export function upsertPlaidInvestmentSnapshotsForUser(
  _userId: string,
  _source: string,
): Promise<{ upserted: number }> {
  return Promise.resolve({ upserted: 0 });
}

/**
 * Upsert today's snapshot for every source (plaid bank + snaptrade + manual)
 * belonging to a user. Used by account-create / link paths so today's bucket
 * sums all accounts — not just the one just added — and by the nightly cron.
 * Each per-source upsert is idempotent on (accountId, snapshotDate).
 */
export async function upsertAllBalanceSnapshots(userId: string, source: string): Promise<void> {
  await Promise.all([
    upsertBankBalanceSnapshotsForUser(userId, source),
    upsertSnapTradePortfolioSnapshotsForUser(userId, source),
    upsertManualBalanceSnapshotsForUser(userId, source),
  ]);
}
