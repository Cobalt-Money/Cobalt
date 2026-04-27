import { db } from "@cobalt-web/db";
import { holding } from "@cobalt-web/db/schema/banking/investments/holding";
import { investmentActivity } from "@cobalt-web/db/schema/banking/investments/investment-activity";
import { security } from "@cobalt-web/db/schema/banking/investments/security";
import { sql } from "drizzle-orm";
import type {
  Holding as PlaidHolding,
  InvestmentTransaction,
  Security as PlaidSecurity,
} from "plaid";

import { lookupFinancialAccountsByPlaidIds } from "../link/queries.js";
import { lookupSecuritiesByPlaidIds } from "./queries.js";

const BATCH_SIZE = 100;

const externalIdNotNullWhere = sql`external_id IS NOT NULL`;

function numToStr(
  value: number | string | boolean | null | undefined
): string | null {
  return value === null || value === undefined ? null : String(value);
}

export async function upsertInvestmentSecurities(
  securities: PlaidSecurity[]
): Promise<void> {
  if (securities.length === 0) {
    return;
  }

  const rows = securities.map((s) => ({
    closePrice: numToStr(s.close_price),
    closePriceAsOf: s.close_price_as_of ?? null,
    cusip: s.cusip ?? null,
    externalId: s.security_id,
    fixedIncome: s.fixed_income ?? null,
    industry: s.industry ?? null,
    institutionId: s.institution_id ?? null,
    institutionSecurityId: s.institution_security_id ?? null,
    isCashEquivalent: s.is_cash_equivalent ?? null,
    isin: s.isin ?? null,
    isoCurrencyCode: s.iso_currency_code ?? null,
    marketIdentifierCode: s.market_identifier_code ?? null,
    name: s.name ?? null,
    optionContract: s.option_contract ?? null,
    proxySecurityId: s.proxy_security_id ?? null,
    sector: s.sector ?? null,
    sedol: s.sedol ?? null,
    source: "plaid" as const,
    subtype: numToStr(s.subtype),
    tickerSymbol: s.ticker_symbol ?? null,
    type: s.type ?? null,
    unofficialCurrencyCode: s.unofficial_currency_code ?? null,
    updateDatetime: s.update_datetime ? new Date(s.update_datetime) : null,
  }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(security)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          closePrice: sql`excluded.close_price`,
          closePriceAsOf: sql`excluded.close_price_as_of`,
          cusip: sql`excluded.cusip`,
          fixedIncome: sql`excluded.fixed_income`,
          industry: sql`excluded.industry`,
          institutionId: sql`excluded.institution_id`,
          institutionSecurityId: sql`excluded.institution_security_id`,
          isCashEquivalent: sql`excluded.is_cash_equivalent`,
          isin: sql`excluded.isin`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          marketIdentifierCode: sql`excluded.market_identifier_code`,
          name: sql`excluded.name`,
          optionContract: sql`excluded.option_contract`,
          proxySecurityId: sql`excluded.proxy_security_id`,
          sector: sql`excluded.sector`,
          sedol: sql`excluded.sedol`,
          subtype: sql`excluded.subtype`,
          tickerSymbol: sql`excluded.ticker_symbol`,
          type: sql`excluded.type`,
          unofficialCurrencyCode: sql`excluded.unofficial_currency_code`,
          updateDatetime: sql`excluded.update_datetime`,
          updatedAt: new Date(),
        },
        target: [security.source, security.externalId],
        targetWhere: externalIdNotNullWhere,
      });
  }
}

export async function upsertInvestmentPositions(
  holdings: PlaidHolding[]
): Promise<void> {
  if (holdings.length === 0) {
    return;
  }

  const plaidAccountIds = [...new Set(holdings.map((h) => h.account_id))];
  const plaidSecurityIds = [...new Set(holdings.map((h) => h.security_id))];

  const [accountMap, securityMap] = await Promise.all([
    lookupFinancialAccountsByPlaidIds(plaidAccountIds),
    lookupSecuritiesByPlaidIds(plaidSecurityIds),
  ]);

  const rows = holdings
    .map((h) => {
      const acct = accountMap.get(h.account_id);
      const secId = securityMap.get(h.security_id);
      if (!acct || !secId) {
        return null;
      }
      return {
        accountId: acct.id,
        costBasis: numToStr(h.cost_basis),
        institutionPrice: String(h.institution_price),
        institutionPriceAsOf: h.institution_price_as_of ?? null,
        institutionPriceDatetime: h.institution_price_datetime
          ? new Date(h.institution_price_datetime)
          : null,
        institutionValue: String(h.institution_value),
        isoCurrencyCode: h.iso_currency_code ?? null,
        quantity: String(h.quantity),
        securityId: secId,
        source: "plaid" as const,
        unofficialCurrencyCode: h.unofficial_currency_code ?? null,
        userId: acct.userId,
        vestedQuantity: numToStr(h.vested_quantity),
        vestedValue: numToStr(h.vested_value),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(holding)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          costBasis: sql`excluded.cost_basis`,
          institutionPrice: sql`excluded.institution_price`,
          institutionPriceAsOf: sql`excluded.institution_price_as_of`,
          institutionPriceDatetime: sql`excluded.institution_price_datetime`,
          institutionValue: sql`excluded.institution_value`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          quantity: sql`excluded.quantity`,
          unofficialCurrencyCode: sql`excluded.unofficial_currency_code`,
          updatedAt: new Date(),
          vestedQuantity: sql`excluded.vested_quantity`,
          vestedValue: sql`excluded.vested_value`,
        },
        target: [holding.accountId, holding.securityId],
      });
  }
}

export async function upsertInvestmentActivities(
  transactions: InvestmentTransaction[]
): Promise<void> {
  if (transactions.length === 0) {
    return;
  }

  const plaidAccountIds = [...new Set(transactions.map((t) => t.account_id))];
  const plaidSecurityIds = [
    ...new Set(
      transactions
        .map((t) => t.security_id)
        .filter((id): id is string => id !== null && id !== undefined)
    ),
  ];

  const [accountMap, securityMap] = await Promise.all([
    lookupFinancialAccountsByPlaidIds(plaidAccountIds),
    lookupSecuritiesByPlaidIds(plaidSecurityIds),
  ]);

  const rows = transactions
    .map((tx) => {
      const acct = accountMap.get(tx.account_id);
      if (!acct) {
        return null;
      }
      const secId = tx.security_id ? securityMap.get(tx.security_id) : null;
      return {
        accountId: acct.id,
        amount: String(tx.amount),
        cancelTransactionId: tx.cancel_transaction_id ?? null,
        date: tx.date,
        externalId: tx.investment_transaction_id,
        fees: numToStr(tx.fees),
        isoCurrencyCode: tx.iso_currency_code ?? null,
        name: tx.name,
        price: String(tx.price),
        quantity: String(tx.quantity),
        securityId: secId ?? null,
        source: "plaid" as const,
        subtype: tx.subtype ? String(tx.subtype) : null,
        type: tx.type,
        unofficialCurrencyCode: tx.unofficial_currency_code ?? null,
        userId: acct.userId,
      };
    })
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
          cancelTransactionId: sql`excluded.cancel_transaction_id`,
          date: sql`excluded.date`,
          fees: sql`excluded.fees`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          name: sql`excluded.name`,
          price: sql`excluded.price`,
          quantity: sql`excluded.quantity`,
          securityId: sql`excluded.security_id`,
          subtype: sql`excluded.subtype`,
          type: sql`excluded.type`,
          unofficialCurrencyCode: sql`excluded.unofficial_currency_code`,
          updatedAt: new Date(),
        },
        target: [investmentActivity.source, investmentActivity.externalId],
        targetWhere: externalIdNotNullWhere,
      });
  }
}
