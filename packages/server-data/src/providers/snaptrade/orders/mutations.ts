import { db } from "@cobalt-web/db";
import { orders } from "@cobalt-web/db/schema/accounts/investments/order";
import { sql } from "drizzle-orm";
import type { AccountOrderRecord } from "snaptrade-typescript-sdk";

import { lookupFinancialAccountsBySnaptradeIds } from "../accounts/queries.js";
import { lookupSecuritiesBySnaptradeSymbolIds } from "../holdings/queries.js";
import { toDecimalString } from "../lib.js";

const BATCH_SIZE = 100;

export async function upsertAccountOrders(
  snaptradeAccountId: string,
  appUserId: string,
  ordersData: AccountOrderRecord[],
): Promise<void> {
  if (ordersData.length === 0) {
    return;
  }

  const accountMap = await lookupFinancialAccountsBySnaptradeIds([snaptradeAccountId]);
  const acct = accountMap.get(snaptradeAccountId);
  if (!acct) {
    throw new Error(
      `financial_account not found for SnapTrade account ${snaptradeAccountId} (user ${appUserId})`,
    );
  }

  const symbolIds = ordersData
    .map((o) => o.universal_symbol?.id ?? null)
    .filter((id): id is string => typeof id === "string");
  const securityMap = await lookupSecuritiesBySnaptradeSymbolIds(symbolIds);

  const rows = ordersData
    .map((o) => buildRow(o, acct.id, acct.userId, securityMap))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(orders)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          accountId: sql`excluded.account_id`,
          action: sql`excluded.action`,
          canceledQuantity: sql`excluded.canceled_quantity`,
          childBrokerageOrderIds: sql`excluded.child_brokerage_order_ids`,
          currency: sql`excluded.currency`,
          executionPrice: sql`excluded.execution_price`,
          expirationDate: sql`excluded.expiration_date`,
          expiryDate: sql`excluded.expiry_date`,
          filledQuantity: sql`excluded.filled_quantity`,
          isMiniOption: sql`excluded.is_mini_option`,
          limitPrice: sql`excluded.limit_price`,
          openQuantity: sql`excluded.open_quantity`,
          optionSymbol: sql`excluded.option_symbol`,
          optionType: sql`excluded.option_type`,
          orderType: sql`excluded.order_type`,
          securityId: sql`excluded.security_id`,
          status: sql`excluded.status`,
          stopPrice: sql`excluded.stop_price`,
          strikePrice: sql`excluded.strike_price`,
          timeExecuted: sql`excluded.time_executed`,
          timeInForce: sql`excluded.time_in_force`,
          timePlaced: sql`excluded.time_placed`,
          timeUpdated: sql`excluded.time_updated`,
          totalQuantity: sql`excluded.total_quantity`,
          updatedAt: new Date(),
        },
        target: orders.externalId,
      });
  }
}

function toDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

function toDecimalOrNull(value: string | number | null | undefined): string | null {
  return toDecimalString(value) || null;
}

function resolveStrikePrice(order: AccountOrderRecord): string | null {
  const raw = (order as { strike_price?: number | string | null }).strike_price;
  if (raw === null || raw === undefined) {
    return null;
  }
  return toDecimalOrNull(Number(raw));
}

function buildRow(
  order: AccountOrderRecord,
  accountId: string,
  userId: string,
  securityMap: Map<string, string>,
) {
  const externalId = order.brokerage_order_id ?? order.id;
  if (!externalId) {
    return null;
  }

  const symbolId = order.universal_symbol?.id ?? null;
  const securityId = symbolId ? (securityMap.get(symbolId) ?? null) : null;
  const currencyCode = order.universal_symbol?.currency?.code ?? "USD";

  return {
    accountId,
    action: order.action ?? null,
    canceledQuantity: toDecimalOrNull(order.canceled_quantity),
    childBrokerageOrderIds: order.child_brokerage_order_ids ?? null,
    currency: currencyCode,
    executionPrice: toDecimalOrNull(order.execution_price),
    expirationDate: toDate(order.expiration_date),
    expiryDate: toDate(order.expiry_date),
    externalId: String(externalId),
    filledQuantity: toDecimalOrNull(order.filled_quantity),
    isMiniOption: order.is_mini_option ?? null,
    limitPrice: toDecimalOrNull(order.limit_price),
    openQuantity: toDecimalOrNull(order.open_quantity),
    optionSymbol: order.option_symbol ?? null,
    optionType: typeof order.option_type === "string" ? order.option_type : null,
    orderType: order.order_type ?? null,
    securityId,
    status: order.status ?? null,
    stopPrice: toDecimalOrNull(order.stop_price),
    strikePrice: resolveStrikePrice(order),
    timeExecuted: toDate(order.time_executed),
    timeInForce: order.time_in_force ?? null,
    timePlaced: toDate(order.time_placed),
    timeUpdated: toDate(order.time_updated),
    totalQuantity: toDecimalOrNull(order.total_quantity),
    userId,
  };
}
