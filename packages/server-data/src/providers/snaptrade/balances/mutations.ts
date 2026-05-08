import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { sql } from "drizzle-orm";
import type { Account, Balance } from "snaptrade-typescript-sdk";

import { lookupFinancialAccountsBySnaptradeIds } from "../accounts/queries.js";
import { toDecimalString } from "../lib.js";

/**
 * Upsert the balance row for a SnapTrade brokerage account. `current` holds
 * the full account market value (cash + positions) sourced from
 * `Account.balance.total.amount` when available; `available` holds uninvested
 * cash from `Balance.cash`. Falls back to cash for `current` when account
 * details aren't supplied so callers without access to details still write a
 * non-null value.
 */
export async function upsertAccountBalances(
  snaptradeAccountId: string,
  appUserId: string,
  balancesData: Balance[],
  accountDetails?: Account,
): Promise<void> {
  if (balancesData.length === 0) {
    return;
  }

  const accountMap = await lookupFinancialAccountsBySnaptradeIds([snaptradeAccountId]);
  const acct = accountMap.get(snaptradeAccountId);
  if (!acct) {
    throw new Error(
      `financial_account not found for SnapTrade account ${snaptradeAccountId} (user ${appUserId})`,
    );
  }

  const [primary] = balancesData;
  if (!primary) {
    return;
  }
  const currency = primary.currency || {};
  const currencyCode = currency.code || primary.currency_code || "USD";

  const cashStr = toDecimalString(primary.cash) || "0";
  const totalAmount = accountDetails?.balance?.total?.amount;
  const totalStr = toDecimalString(totalAmount);

  const row = {
    accountId: acct.id,
    available: cashStr,
    buyingPower: toDecimalString(primary.buying_power) || "0",
    currency: currencyCode,
    current: totalStr ?? cashStr,
    lastSyncAt: new Date(),
    userId: acct.userId,
  };

  await db
    .insert(balance)
    .values(row)
    .onConflictDoUpdate({
      set: {
        available: sql`excluded.available`,
        buyingPower: sql`excluded.buying_power`,
        currency: sql`excluded.currency`,
        current: sql`excluded.current`,
        lastSyncAt: sql`excluded.last_sync_at`,
        updatedAt: new Date(),
      },
      target: balance.accountId,
    });
}
