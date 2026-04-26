import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { financialAccount } from "@cobalt-web/db/schema/accounts/financial-account";
import { holding } from "@cobalt-web/db/schema/accounts/holding";
import { investmentActivity } from "@cobalt-web/db/schema/accounts/investment-activity";
import { security } from "@cobalt-web/db/schema/accounts/security";
import { institution } from "@cobalt-web/db/schema/banking";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { and, desc, eq } from "drizzle-orm";

const num = (v: string | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v);

// ── Investment accounts (Plaid) ───────────────────────────────────────

export async function getPlaidInvestmentAccountsByUserId(userId: string) {
  const rows = await db
    .select({
      acct: {
        externalId: financialAccount.externalId,
        mask: financialAccount.mask,
        name: financialAccount.name,
        subtype: financialAccount.subtype,
        type: financialAccount.type,
      },
      balance: {
        available: balance.available,
        current: balance.current,
        isoCurrencyCode: balance.isoCurrencyCode,
        unofficialCurrencyCode: balance.unofficialCurrencyCode,
        updatedAt: balance.updatedAt,
      },
      conn: {
        institutionId: plaidConnection.institutionId,
        institutionName: plaidConnection.institutionName,
        plaidItemId: plaidConnection.plaidItemId,
      },
      inst: { logo: institution.logo, url: institution.url },
    })
    .from(financialAccount)
    .innerJoin(
      plaidConnection,
      eq(financialAccount.plaidConnectionId, plaidConnection.id)
    )
    .leftJoin(balance, eq(balance.accountId, financialAccount.id))
    .leftJoin(
      institution,
      eq(institution.plaidInstitutionId, plaidConnection.institutionId)
    )
    .where(
      and(
        eq(financialAccount.userId, userId),
        eq(financialAccount.source, "plaid"),
        eq(financialAccount.type, "investment")
      )
    );

  return rows.map((row) => {
    const currency =
      row.balance?.isoCurrencyCode ??
      row.balance?.unofficialCurrencyCode ??
      null;
    return {
      accountName: row.acct.name,
      availableBalance: num(row.balance?.available ?? null),
      currency,
      currentBalance: num(row.balance?.current ?? null),
      institutionId: row.conn.institutionId,
      institutionLogo: row.inst?.logo ?? null,
      institutionName: row.conn.institutionName,
      institutionUrl: row.inst?.url ?? null,
      itemId: row.conn.plaidItemId,
      mask: row.acct.mask,
      plaidAccountId: row.acct.externalId ?? "",
      subtype: row.acct.subtype,
      type: row.acct.type,
      updatedAt: row.balance?.updatedAt ?? null,
    };
  });
}

// ── Holdings ────────────────────────────────────────────────────────

export async function getPlaidHoldingsByUserId(
  userId: string,
  accountId?: string
) {
  const conditions = [
    eq(holding.userId, userId),
    eq(financialAccount.source, "plaid"),
  ];
  if (accountId) {
    conditions.push(eq(financialAccount.externalId, accountId));
  }

  const rows = await db
    .select({
      account: {
        externalId: financialAccount.externalId,
        name: financialAccount.name,
      },
      conn: {
        institutionName: plaidConnection.institutionName,
      },
      holding: {
        costBasis: holding.costBasis,
        id: holding.id,
        institutionPrice: holding.institutionPrice,
        institutionPriceAsOf: holding.institutionPriceAsOf,
        institutionValue: holding.institutionValue,
        isoCurrencyCode: holding.isoCurrencyCode,
        quantity: holding.quantity,
        securityId: holding.securityId,
        updatedAt: holding.updatedAt,
        vestedQuantity: holding.vestedQuantity,
        vestedValue: holding.vestedValue,
      },
      sec: {
        closePrice: security.closePrice,
        closePriceAsOf: security.closePriceAsOf,
        industry: security.industry,
        isCashEquivalent: security.isCashEquivalent,
        name: security.name,
        sector: security.sector,
        subtype: security.subtype,
        tickerSymbol: security.tickerSymbol,
        type: security.type,
      },
    })
    .from(holding)
    .innerJoin(financialAccount, eq(holding.accountId, financialAccount.id))
    .innerJoin(security, eq(holding.securityId, security.id))
    .leftJoin(
      plaidConnection,
      eq(financialAccount.plaidConnectionId, plaidConnection.id)
    )
    .where(and(...conditions));

  return rows.map((row) => ({
    accountName: row.account.name,
    closePrice: num(row.sec.closePrice),
    closePriceAsOf: row.sec.closePriceAsOf,
    costBasis: num(row.holding.costBasis),
    holdingUpdatedAt: row.holding.updatedAt,
    id: row.holding.id,
    industry: row.sec.industry,
    institutionName: row.conn?.institutionName ?? null,
    institutionPrice: num(row.holding.institutionPrice),
    institutionPriceAsOf: row.holding.institutionPriceAsOf,
    institutionValue: num(row.holding.institutionValue) ?? 0,
    isCashEquivalent: row.sec.isCashEquivalent,
    isoCurrencyCode: row.holding.isoCurrencyCode,
    plaidAccountId: row.account.externalId ?? "",
    quantity: Number(row.holding.quantity),
    sector: row.sec.sector,
    securityId: row.holding.securityId,
    securityName: row.sec.name,
    securitySubtype: row.sec.subtype,
    securityType: row.sec.type,
    tickerSymbol: row.sec.tickerSymbol,
    vestedQuantity: num(row.holding.vestedQuantity),
    vestedValue: num(row.holding.vestedValue),
  }));
}

// ── Investment transactions ───────────────────────────────────────────

export async function getPlaidInvestmentTransactionsByUserId(
  userId: string,
  accountId?: string,
  limit = 50
) {
  const conditions = [
    eq(investmentActivity.userId, userId),
    eq(financialAccount.source, "plaid"),
  ];
  if (accountId) {
    conditions.push(eq(financialAccount.externalId, accountId));
  }

  const rows = await db
    .select({
      account: {
        externalId: financialAccount.externalId,
        name: financialAccount.name,
      },
      activity: {
        amount: investmentActivity.amount,
        date: investmentActivity.date,
        externalId: investmentActivity.externalId,
        fees: investmentActivity.fees,
        id: investmentActivity.id,
        isoCurrencyCode: investmentActivity.isoCurrencyCode,
        name: investmentActivity.name,
        price: investmentActivity.price,
        quantity: investmentActivity.quantity,
        securityId: investmentActivity.securityId,
        subtype: investmentActivity.subtype,
        type: investmentActivity.type,
      },
      sec: {
        name: security.name,
        tickerSymbol: security.tickerSymbol,
        type: security.type,
      },
    })
    .from(investmentActivity)
    .innerJoin(
      financialAccount,
      eq(investmentActivity.accountId, financialAccount.id)
    )
    .leftJoin(security, eq(investmentActivity.securityId, security.id))
    .where(and(...conditions))
    .orderBy(desc(investmentActivity.date))
    .limit(limit);

  return rows.map((row) => ({
    accountName: row.account.name,
    amount: num(row.activity.amount),
    date: row.activity.date,
    fees: num(row.activity.fees),
    id: row.activity.id,
    investmentTransactionId: row.activity.externalId,
    isoCurrencyCode: row.activity.isoCurrencyCode,
    name: row.activity.name,
    plaidAccountId: row.account.externalId ?? "",
    price: num(row.activity.price),
    quantity: num(row.activity.quantity),
    securityId: row.activity.securityId,
    securityName: row.sec?.name ?? null,
    securityType: row.sec?.type ?? null,
    subtype: row.activity.subtype ?? "",
    tickerSymbol: row.sec?.tickerSymbol ?? null,
    type: row.activity.type,
  }));
}

export type PlaidInvestmentAccountRow = Awaited<
  ReturnType<typeof getPlaidInvestmentAccountsByUserId>
>[number];
export type PlaidHoldingRow = Awaited<
  ReturnType<typeof getPlaidHoldingsByUserId>
>[number];
export type PlaidInvestmentTransactionRow = Awaited<
  ReturnType<typeof getPlaidInvestmentTransactionsByUserId>
>[number];
