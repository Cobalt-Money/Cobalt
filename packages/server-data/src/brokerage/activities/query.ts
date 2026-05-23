import { db } from "@cobalt-web/db";

import { toDateString, toISOString } from "../_shared/lib.js";
import type { ActivitiesQuery, ActivitiesResponse } from "./schema.js";

const numStr = (v: string | null | undefined): string | null =>
  v === null || v === undefined ? null : v;

const groupBy = <T>(items: T[], key: (item: T) => string): Record<string, T[]> => {
  const map: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    (map[k] ??= []).push(item);
  }
  return map;
};

// ── Plaid investment-activity type vocabulary normalization ─────────

const PLAID_SUBTYPE_LABEL: Record<string, string> = {
  "account fee": "FEE",
  contribution: "CONTRIBUTION",
  deposit: "CONTRIBUTION",
  dividend: "DIVIDEND",
  "dividend reinvestment": "DIVIDEND",
  "fund fee": "FEE",
  interest: "INTEREST",
  "interest receivable": "INTEREST",
  "interest reinvestment": "INTEREST",
  "legal fee": "FEE",
  "long-term capital gain": "CAPITAL_GAIN",
  "long-term capital gain reinvestment": "CAPITAL_GAIN",
  "management fee": "FEE",
  merger: "CORPORATE_ACTION",
  "miscellaneous fee": "FEE",
  "non-qualified dividend": "DIVIDEND",
  "non-resident tax": "TAX",
  "qualified dividend": "DIVIDEND",
  "short-term capital gain": "CAPITAL_GAIN",
  "short-term capital gain reinvestment": "CAPITAL_GAIN",
  "spin off": "CORPORATE_ACTION",
  split: "CORPORATE_ACTION",
  "stock distribution": "CORPORATE_ACTION",
  tax: "TAX",
  "tax withheld": "TAX",
  transfer: "TRANSFER",
  "transfer fee": "FEE",
  "trust fee": "FEE",
  withdrawal: "WITHDRAWAL",
};

const PLAID_TYPE_LABEL: Record<string, string> = {
  buy: "BUY",
  cancel: "CANCEL",
  cash: "CASH",
  fee: "FEE",
  sell: "SELL",
  transfer: "TRANSFER",
};

function normalizeActivityType(source: string, type: string, subtype: string | null): string {
  if (source !== "plaid") {
    return type;
  }
  if (subtype) {
    const sub = PLAID_SUBTYPE_LABEL[subtype];
    if (sub !== undefined) {
      return sub;
    }
  }
  const t = PLAID_TYPE_LABEL[type];
  if (t !== undefined) {
    return t;
  }
  return type.toUpperCase();
}

function fetchActivityRows(
  userId: string,
  accountId: string | undefined,
  opts: { limit?: number; offset?: number },
) {
  return db.query.investmentActivity.findMany({
    columns: {
      amount: true,
      createdAt: true,
      currency: true,
      date: true,
      externalId: true,
      externalReferenceId: true,
      fees: true,
      id: true,
      name: true,
      optionSymbol: true,
      optionType: true,
      price: true,
      quantity: true,
      settlementDate: true,
      source: true,
      subtype: true,
      type: true,
      updatedAt: true,
    },
    ...(opts.limit === undefined ? {} : { limit: opts.limit }),
    ...(opts.offset === undefined ? {} : { offset: opts.offset }),
    orderBy: { date: "desc" },
    where: {
      userId: { eq: userId },
      ...(accountId ? { account: { externalId: { eq: accountId } } } : {}),
    },
    with: {
      account: { columns: { externalId: true } },
      security: {
        columns: {
          exchangeCode: true,
          exchangeName: true,
          externalId: true,
          figiCode: true,
          marketIdentifierCode: true,
          name: true,
          subtype: true,
          tickerSymbol: true,
          type: true,
        },
      },
    },
  });
}

type ActivityRow = Awaited<ReturnType<typeof fetchActivityRows>>[number];

function pickSecurityFields(sec: ActivityRow["security"]) {
  return {
    exchangeCode: sec?.exchangeCode ?? null,
    exchangeMicCode: sec?.marketIdentifierCode ?? null,
    exchangeName: sec?.exchangeName ?? null,
    figiCode: sec?.figiCode ?? null,
    securityTypeCode: sec?.type ?? null,
    securityTypeDescription: sec?.subtype ?? null,
    symbolDescription: sec?.name ?? null,
    symbolId: sec?.externalId ?? null,
    ticker: sec?.tickerSymbol ?? null,
  };
}

function mapActivityRow(r: ActivityRow, userId: string) {
  const sec = pickSecurityFields(r.security);
  const acctExternal = r.account.externalId ?? "";
  return {
    accountId: acctExternal,
    activityId: r.externalId,
    amount: numStr(r.amount),
    createdAt: toISOString(r.createdAt),
    currencyCode: r.currency ?? "USD",
    currencyId: null,
    currencyName: "US Dollar",
    description: r.name,
    exchangeCode: sec.exchangeCode,
    exchangeId: null,
    exchangeMicCode: sec.exchangeMicCode,
    exchangeName: sec.exchangeName,
    externalReferenceId: r.externalReferenceId,
    fee: numStr(r.fees),
    figiCode: sec.figiCode,
    fxRate: null,
    id: r.id,
    institution: null,
    lastSync: toISOString(r.updatedAt),
    optionSymbol: r.optionSymbol,
    optionType: r.optionType,
    pagination: null,
    price: numStr(r.price),
    rawSymbol: sec.ticker,
    securityTypeCode: sec.securityTypeCode,
    securityTypeDescription: sec.securityTypeDescription,
    securityTypeId: null,
    settlementDate: toDateString(r.settlementDate),
    snapTradeAccountId: acctExternal,
    symbol: sec.ticker,
    symbolDescription: sec.symbolDescription,
    symbolId: sec.symbolId,
    symbolTicker: sec.ticker,
    tradeDate: toDateString(r.date),
    type: normalizeActivityType(r.source, r.type, r.subtype),
    units: numStr(r.quantity),
    updatedAt: toISOString(r.updatedAt),
    userId,
  };
}

// Inline ownership in WHERE via account.externalId + userId.
export async function getActivities(
  userId: string,
  params: ActivitiesQuery,
): Promise<ActivitiesResponse> {
  const { accountId, limit, offset } = params;
  const rows = await fetchActivityRows(userId, accountId, { limit, offset });
  const activities = rows.map((r) => mapActivityRow(r, userId));
  return {
    activities,
    activitiesByAccount: groupBy(activities, (a) => a.accountId),
  };
}
