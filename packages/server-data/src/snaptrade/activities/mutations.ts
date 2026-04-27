import { db } from "@cobalt-web/db";
import { investmentActivity } from "@cobalt-web/db/schema/banking/investments/investment-activity";
import { sql } from "drizzle-orm";
import type { UniversalActivity } from "snaptrade-typescript-sdk";

import { lookupFinancialAccountsBySnaptradeIds } from "../accounts/queries.js";
import { lookupSecuritiesBySnaptradeSymbolIds } from "../holdings/queries.js";
import { extractDateFromISO, toDecimalString } from "../lib.js";

type AnyRecord = Record<string, unknown>;

const BATCH_SIZE = 100;

const externalIdNotNullWhere = sql`external_id IS NOT NULL`;

export async function upsertAccountActivities(
  snaptradeAccountId: string,
  appUserId: string,
  activitiesData: UniversalActivity[]
): Promise<void> {
  if (activitiesData.length === 0) {
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

  const symbolIds = activitiesData
    .map((a) => extractSymbolId(a))
    .filter((id): id is string => id !== null && id !== undefined);
  const securityMap = await lookupSecuritiesBySnaptradeSymbolIds(symbolIds);

  const rows = activitiesData
    .map((a) => buildRow(a, acct.id, acct.userId, securityMap))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(investmentActivity)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          accountId: sql`excluded.account_id`,
          amount: sql`excluded.amount`,
          date: sql`excluded.date`,
          externalReferenceId: sql`excluded.external_reference_id`,
          fees: sql`excluded.fees`,
          fxRate: sql`excluded.fx_rate`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          name: sql`excluded.name`,
          optionSymbol: sql`excluded.option_symbol`,
          optionType: sql`excluded.option_type`,
          price: sql`excluded.price`,
          quantity: sql`excluded.quantity`,
          securityId: sql`excluded.security_id`,
          settlementDate: sql`excluded.settlement_date`,
          type: sql`excluded.type`,
          updatedAt: new Date(),
        },
        target: [investmentActivity.source, investmentActivity.externalId],
        targetWhere: externalIdNotNullWhere,
      });
  }
}

function extractSymbolId(activity: UniversalActivity): string | null {
  const symbolData = activity.symbol as AnyRecord | undefined;
  const id =
    (symbolData?.id as string | undefined) ?? activity.symbol_id ?? null;
  return typeof id === "string" ? id : null;
}

function resolveCurrency(activity: UniversalActivity): string {
  const symbolData = (activity.symbol as AnyRecord | undefined) ?? {};
  const currencyData =
    (symbolData.currency as AnyRecord | undefined) ??
    (activity.currency as AnyRecord | undefined) ??
    {};
  return (
    (currencyData.code as string | undefined) ?? activity.currency_code ?? "USD"
  );
}

function resolveOptionSymbol(raw: unknown): string | null {
  if (typeof raw === "string") {
    return raw;
  }
  return (raw as { ticker?: string } | null)?.ticker ?? null;
}

function resolveActivityDate(value: string | null | undefined): string {
  const extracted = value && extractDateFromISO(value);
  if (extracted) {
    return extracted;
  }
  return new Date().toISOString().split("T").at(0) ?? "";
}

function buildRow(
  activity: UniversalActivity,
  accountId: string,
  userId: string,
  securityMap: Map<string, string>
) {
  const externalId = activity.activity_id ?? activity.id;
  if (!externalId) {
    return null;
  }

  const symbolId = extractSymbolId(activity);
  const securityId = symbolId ? (securityMap.get(symbolId) ?? null) : null;

  return {
    accountId,
    amount: toDecimalString(activity.amount) || "0",
    date: resolveActivityDate(activity.trade_date),
    externalId: String(externalId),
    externalReferenceId: activity.external_reference_id ?? null,
    fees: toDecimalString(activity.fee) || null,
    fxRate: toDecimalString(activity.fx_rate) || null,
    isoCurrencyCode: resolveCurrency(activity),
    name: activity.description ?? "",
    optionSymbol: resolveOptionSymbol(activity.option_symbol),
    optionType:
      typeof activity.option_type === "string" ? activity.option_type : null,
    price: toDecimalString(activity.price) || null,
    quantity: toDecimalString(activity.units) || null,
    securityId,
    settlementDate:
      (activity.settlement_date &&
        extractDateFromISO(activity.settlement_date)) ||
      null,
    source: "snaptrade" as const,
    type: activity.type ?? "unknown",
    userId,
  };
}
