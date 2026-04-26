import { db } from "@cobalt-web/db";
import { holding } from "@cobalt-web/db/schema/accounts/holding";
import { security } from "@cobalt-web/db/schema/accounts/security";
import { sql } from "drizzle-orm";
import type { AccountHoldingsAccount } from "snaptrade-typescript-sdk";

import { lookupFinancialAccountsBySnaptradeIds } from "../accounts/queries.js";
import { toDecimalString } from "../lib.js";
import { resolvePositionNestedData } from "./lib.js";
import { lookupSecuritiesBySnaptradeSymbolIds } from "./queries.js";

type AnyRecord = Record<string, unknown>;

const BATCH_SIZE = 100;

const externalIdNotNullWhere = sql`external_id IS NOT NULL`;

export async function upsertAccountPositions(
  snaptradeAccountId: string,
  appUserId: string,
  positionsData: AccountHoldingsAccount["positions"]
): Promise<void> {
  if (
    !positionsData ||
    !Array.isArray(positionsData) ||
    positionsData.length === 0
  ) {
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

  // Step 1: extract security rows (one per position) and upsert.
  const securityRows = positionsData
    .map((p) => extractSecurityRow(p as AnyRecord))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < securityRows.length; i += BATCH_SIZE) {
    const batch = securityRows.slice(i, i + BATCH_SIZE);
    await db
      .insert(security)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          exchangeCode: sql`excluded.exchange_code`,
          exchangeName: sql`excluded.exchange_name`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          name: sql`excluded.name`,
          tickerSymbol: sql`excluded.ticker_symbol`,
          type: sql`excluded.type`,
          updatedAt: new Date(),
        },
        target: [security.source, security.externalId],
        targetWhere: externalIdNotNullWhere,
      });
  }

  // Step 2: resolve security uuids by snaptrade symbol_id.
  const symbolIds = securityRows
    .map((r) => r.externalId)
    .filter((id): id is string => id !== null && id !== undefined);
  const securityMap = await lookupSecuritiesBySnaptradeSymbolIds(symbolIds);

  // Step 3: build holding rows, upsert.
  const holdingRows = positionsData
    .map((p) =>
      buildHoldingRow(p as AnyRecord, acct.id, acct.userId, securityMap)
    )
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < holdingRows.length; i += BATCH_SIZE) {
    const batch = holdingRows.slice(i, i + BATCH_SIZE);
    await db
      .insert(holding)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          averagePrice: sql`excluded.average_price`,
          institutionPrice: sql`excluded.institution_price`,
          isQuotable: sql`excluded.is_quotable`,
          isTradable: sql`excluded.is_tradable`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          lastSyncAt: sql`excluded.last_sync_at`,
          openPnl: sql`excluded.open_pnl`,
          quantity: sql`excluded.quantity`,
          updatedAt: new Date(),
        },
        target: [holding.accountId, holding.securityId],
      });
  }
}

function extractSecurityRow(position: AnyRecord) {
  const resolved = resolvePositionNestedData(position);
  const { symbolData, currencyData, exchangeData, securityTypeData, ticker } =
    resolved;
  const symbolId = (symbolData as AnyRecord).id ?? position.symbol_id ?? null;
  if (typeof symbolId !== "string") {
    return null;
  }

  return {
    exchangeCode:
      ((exchangeData as AnyRecord).code as string | undefined) ??
      (position.exchange_code as string | undefined) ??
      null,
    exchangeName:
      ((exchangeData as AnyRecord).name as string | undefined) ??
      (position.exchange_name as string | undefined) ??
      null,
    externalId: symbolId,
    isoCurrencyCode:
      ((currencyData as AnyRecord).code as string | undefined) ??
      (position.currency_code as string | undefined) ??
      null,
    name:
      ((symbolData as AnyRecord).description as string | undefined) ??
      (position.symbol_description as string | undefined) ??
      null,
    source: "snaptrade" as const,
    tickerSymbol: typeof ticker === "string" ? ticker : null,
    type:
      ((securityTypeData as AnyRecord).code as string | undefined) ??
      (position.security_type_code as string | undefined) ??
      null,
  };
}

function buildHoldingRow(
  position: AnyRecord,
  accountId: string,
  userId: string,
  securityMap: Map<string, string>
) {
  const resolved = resolvePositionNestedData(position);
  const { symbolData, currencyData } = resolved;
  const symbolId = (symbolData as AnyRecord).id ?? position.symbol_id ?? null;
  if (typeof symbolId !== "string") {
    return null;
  }
  const securityId = securityMap.get(symbolId);
  if (!securityId) {
    return null;
  }

  return {
    accountId,
    averagePrice:
      toDecimalString(position.average_purchase_price as number) || null,
    institutionPrice: toDecimalString(position.price as number) || null,
    isQuotable:
      (position.is_quotable as boolean | undefined) ??
      ((symbolData as AnyRecord).is_quotable as boolean | undefined) ??
      true,
    isTradable:
      (position.is_tradable as boolean | undefined) ??
      ((symbolData as AnyRecord).is_tradable as boolean | undefined) ??
      true,
    isoCurrencyCode:
      ((currencyData as AnyRecord).code as string | undefined) ??
      (position.currency_code as string | undefined) ??
      null,
    lastSyncAt: new Date(),
    openPnl: toDecimalString(position.open_pnl as number) || null,
    quantity: toDecimalString(position.units as number) || "0",
    securityId,
    source: "snaptrade" as const,
    userId,
  };
}
