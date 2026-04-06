import { db } from "@cobalt-web/db";
import {
  investmentSecurity,
  investmentPosition,
  investmentActivity,
} from "@cobalt-web/db/schema/banking";
import { sql } from "drizzle-orm";
import type { Security, Holding, InvestmentTransaction } from "plaid";

import {
  mapSecurityToRecord,
  mapHoldingToRecord,
  mapInvestmentTransactionToRecord,
} from "./mappers.js";

// ============================================================================
// Individual Upserts (for small batches)
// ============================================================================

/**
 * Upsert a single security record.
 */
export async function upsertSecurity(s: Security): Promise<void> {
  await db
    .insert(investmentSecurity)
    .values(mapSecurityToRecord(s))
    .onConflictDoUpdate({
      set: {
        closePrice: sql`excluded.close_price`,
        closePriceAsOf: sql`excluded.close_price_as_of`,
        name: sql`excluded.name`,
        tickerSymbol: sql`excluded.ticker_symbol`,
        updateDatetime: sql`excluded.update_datetime`,
        updatedAt: new Date(),
      },
      target: investmentSecurity.securityId,
    });
}

/**
 * Upsert a single holding/position record.
 */
export async function upsertHolding(h: Holding): Promise<void> {
  await db
    .insert(investmentPosition)
    .values(mapHoldingToRecord(h))
    .onConflictDoUpdate({
      set: {
        costBasis: sql`excluded.cost_basis`,
        institutionPrice: sql`excluded.institution_price`,
        institutionPriceAsOf: sql`excluded.institution_price_as_of`,
        institutionPriceDatetime: sql`excluded.institution_price_datetime`,
        institutionValue: sql`excluded.institution_value`,
        quantity: sql`excluded.quantity`,
        updatedAt: new Date(),
      },
      target: [
        investmentPosition.plaidAccountId,
        investmentPosition.securityId,
      ],
    });
}

// ============================================================================
// Batch Upserts (for pagination)
// ============================================================================

const BATCH_SIZE = 100;

/**
 * Batch upsert securities from a page of investment transactions.
 * Maps and upserts all fields (not just the limited set used in holdings sync).
 */
export async function batchUpsertSecurities(
  securities: Security[]
): Promise<void> {
  for (let i = 0; i < securities.length; i += BATCH_SIZE) {
    const batch = securities.slice(i, i + BATCH_SIZE);
    await db
      .insert(investmentSecurity)
      .values(batch.map(mapSecurityToRecord))
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

/**
 * Batch upsert investment transactions.
 */
export async function batchUpsertInvestmentTransactions(
  transactions: InvestmentTransaction[]
): Promise<void> {
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    await db
      .insert(investmentActivity)
      .values(batch.map(mapInvestmentTransactionToRecord))
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
