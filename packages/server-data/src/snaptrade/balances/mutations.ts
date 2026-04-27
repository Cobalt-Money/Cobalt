import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/banking/balances/balance";
import { sql } from "drizzle-orm";
import type { Balance } from "snaptrade-typescript-sdk";

import { lookupFinancialAccountsBySnaptradeIds } from "../accounts/queries.js";
import { toDecimalString } from "../lib.js";

/**
 * Upsert a single balance row for a SnapTrade brokerage account. The unified
 * `balance` table holds one row per account; SnapTrade returns a Balance[] for
 * multi-currency accounts, so we collapse to the first entry. Cash maps to
 * `current`; the SnapTrade-specific `buying_power` and `iso_currency_code`
 * fields are preserved.
 */
export async function upsertAccountBalances(
  snaptradeAccountId: string,
  appUserId: string,
  balancesData: Balance[]
): Promise<void> {
  if (balancesData.length === 0) {
    return;
  }

  const accountMap = await lookupFinancialAccountsBySnaptradeIds([
    snaptradeAccountId,
  ]);
  const acct = accountMap.get(snaptradeAccountId);
  if (!acct) {
    throw new Error(
      `financial_account not found for SnapTrade account ${snaptradeAccountId} (user ${appUserId})`
    );
  }

  const [primary] = balancesData;
  if (!primary) {
    return;
  }
  const currency = primary.currency || {};
  const currencyCode = currency.code || primary.currency_code || "USD";

  const row = {
    accountId: acct.id,
    buyingPower: toDecimalString(primary.buying_power) || "0",
    current: toDecimalString(primary.cash) || "0",
    isoCurrencyCode: currencyCode,
    lastSyncAt: new Date(),
    userId: acct.userId,
  };

  await db
    .insert(balance)
    .values(row)
    .onConflictDoUpdate({
      set: {
        buyingPower: sql`excluded.buying_power`,
        current: sql`excluded.current`,
        isoCurrencyCode: sql`excluded.iso_currency_code`,
        lastSyncAt: sql`excluded.last_sync_at`,
        updatedAt: new Date(),
      },
      target: balance.accountId,
    });
}
