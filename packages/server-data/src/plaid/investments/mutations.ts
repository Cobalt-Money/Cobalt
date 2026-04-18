import { db } from "@cobalt-web/db";
import {
  investmentActivity,
  investmentPosition,
  investmentSecurity,
} from "@cobalt-web/db/schema/banking";
import type { InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";

type InvestmentSecurityInsert = InferInsertModel<typeof investmentSecurity>;
type InvestmentPositionInsert = InferInsertModel<typeof investmentPosition>;
type InvestmentActivityInsert = InferInsertModel<typeof investmentActivity>;

const BATCH_SIZE = 100;

export async function upsertInvestmentSecurities(
  rows: InvestmentSecurityInsert[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(investmentSecurity)
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
        target: investmentSecurity.securityId,
      });
  }
}

export async function upsertInvestmentPositions(
  rows: InvestmentPositionInsert[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(investmentPosition)
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
        target: [
          investmentPosition.plaidAccountId,
          investmentPosition.securityId,
        ],
      });
  }
}

export async function upsertInvestmentActivities(
  rows: InvestmentActivityInsert[]
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db
      .insert(investmentActivity)
      .values(batch)
      .onConflictDoUpdate({
        set: {
          amount: sql`excluded.amount`,
          cancelTransactionId: sql`excluded.cancel_transaction_id`,
          date: sql`excluded.date`,
          fees: sql`excluded.fees`,
          isoCurrencyCode: sql`excluded.iso_currency_code`,
          name: sql`excluded.name`,
          plaidAccountId: sql`excluded.plaid_account_id`,
          price: sql`excluded.price`,
          quantity: sql`excluded.quantity`,
          securityId: sql`excluded.security_id`,
          subtype: sql`excluded.subtype`,
          type: sql`excluded.type`,
          unofficialCurrencyCode: sql`excluded.unofficial_currency_code`,
        },
        target: investmentActivity.investmentTransactionId,
      });
  }
}
