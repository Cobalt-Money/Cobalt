import type { AccountBase, Transaction } from "plaid";
import { describe, expect, it } from "vitest";

import { balanceRowFromPlaidAccount, isLiabilityType } from "./link/lib.js";
import { transactionToRecord } from "./transactions/lib.js";

/**
 * Regression suite for the canonical sign convention at the Plaid ingestion
 * boundary. Plaid's payload uses positive magnitudes for outflows and for
 * liability balances; we normalize at write so every downstream reader sees
 * one convention:
 *
 *   transaction.amount: positive = inflow, negative = outflow
 *   balance.current   : positive = asset value, negative = liability owed
 *
 * If these flip-on-ingestion rules ever regress, net-worth math, spending
 * aggregation, and the public API contract all break together.
 */

function makeAccount(
  overrides: {
    balances?: {
      available?: number | null;
      current?: number | null;
      iso_currency_code?: string | null;
      limit?: number | null;
    };
    type?: string;
  } = {},
): AccountBase {
  const { balances, type } = overrides;
  return {
    account_id: "plaid-account-1",
    balances: {
      available: balances?.available ?? null,
      current: balances?.current ?? 0,
      iso_currency_code: balances?.iso_currency_code ?? "USD",
      limit: balances?.limit ?? null,
      unofficial_currency_code: null,
    },
    mask: "1234",
    name: "Account",
    type: type ?? "depository",
  } as unknown as AccountBase;
}

function makeTxn(amount: number, overrides: Partial<Transaction> = {}): Transaction {
  return {
    account_id: "plaid-account-1",
    account_owner: null,
    amount,
    authorized_date: null,
    authorized_datetime: null,
    category: null,
    category_id: null,
    check_number: null,
    counterparties: null,
    date: "2026-05-27",
    datetime: null,
    iso_currency_code: "USD",
    location: {
      address: null,
      city: null,
      country: null,
      lat: null,
      lon: null,
      postal_code: null,
      region: null,
      store_number: null,
    },
    logo_url: null,
    merchant_entity_id: null,
    merchant_name: null,
    name: "Test",
    payment_channel: "online",
    payment_meta: {
      by_order_of: null,
      payee: null,
      payer: null,
      payment_method: null,
      payment_processor: null,
      ppd_id: null,
      reason: null,
      reference_number: null,
    },
    pending: false,
    pending_transaction_id: null,
    personal_finance_category: null,
    transaction_code: null,
    transaction_id: "tx-1",
    transaction_type: "place",
    unofficial_currency_code: null,
    website: null,
    ...overrides,
  } as Transaction;
}

describe("isLiabilityType", () => {
  it("flags credit and loan as liabilities", () => {
    expect(isLiabilityType("credit")).toBeTruthy();
    expect(isLiabilityType("loan")).toBeTruthy();
  });

  it("treats depository, investment, brokerage, and unknown as assets", () => {
    expect(isLiabilityType("depository")).toBeFalsy();
    expect(isLiabilityType("investment")).toBeFalsy();
    expect(isLiabilityType("brokerage")).toBeFalsy();
    expect(isLiabilityType(null)).toBeFalsy();
    expect(isLiabilityType("other")).toBeFalsy();
  });
});

describe("transactionToRecord — sign convention", () => {
  it("negates a Plaid outflow (positive) to a negative outflow", () => {
    const r = transactionToRecord(makeTxn(19.41), "acct-1", "user-1", "cat-1");
    expect(r.amount).toBe("-19.41");
  });

  it("negates a Plaid inflow (negative) to a positive inflow", () => {
    const r = transactionToRecord(makeTxn(-82), "acct-1", "user-1", "cat-1");
    expect(r.amount).toBe("82");
  });

  it("leaves a zero amount unchanged", () => {
    const r = transactionToRecord(makeTxn(0), "acct-1", "user-1", "cat-1");
    // JavaScript yields "-0" for `String(-0)`. Accept either form.
    expect(["0", "-0"]).toContain(r.amount);
  });
});

describe("balanceRowFromPlaidAccount — sign convention", () => {
  it("preserves sign for depository (asset)", () => {
    const row = balanceRowFromPlaidAccount(
      makeAccount({
        balances: { available: 100, current: 205.21, limit: null },
        type: "depository",
      }),
      "acct-1",
      "user-1",
    );
    expect(row.current).toBe("205.21");
    expect(row.available).toBe("100");
    expect(row.creditLimit).toBeNull();
  });

  it("preserves sign for investment (asset)", () => {
    const row = balanceRowFromPlaidAccount(
      makeAccount({
        balances: { current: 50_000, limit: null },
        type: "investment",
      }),
      "acct-1",
      "user-1",
    );
    expect(row.current).toBe("50000");
  });

  it("flips current/available/limit for credit (liability)", () => {
    const row = balanceRowFromPlaidAccount(
      makeAccount({
        balances: { available: 5193, current: 306.26, limit: 5500 },
        type: "credit",
      }),
      "acct-1",
      "user-1",
    );
    expect(row.current).toBe("-306.26");
    expect(row.available).toBe("-5193");
    expect(row.creditLimit).toBe("-5500");
  });

  it("flips current for loan (liability)", () => {
    const row = balanceRowFromPlaidAccount(
      makeAccount({
        balances: { available: null, current: 13_545.96, limit: null },
        type: "loan",
      }),
      "acct-1",
      "user-1",
    );
    expect(row.current).toBe("-13545.96");
  });

  it("keeps an overpaid credit card (Plaid-negative current) positive after flip", () => {
    // Plaid reports negative `current` when the card has a positive customer
    // balance (overpayment). After our flip, the row should be a positive
    // asset balance.
    const row = balanceRowFromPlaidAccount(
      makeAccount({
        balances: { current: -50, limit: 5500 },
        type: "credit",
      }),
      "acct-1",
      "user-1",
    );
    expect(row.current).toBe("50");
    expect(row.creditLimit).toBe("-5500");
  });

  it("propagates nulls without coercing to zero", () => {
    const row = balanceRowFromPlaidAccount(
      makeAccount({
        balances: { available: null, current: 0, limit: null },
        type: "credit",
      }),
      "acct-1",
      "user-1",
    );
    expect(row.available).toBeNull();
    expect(row.creditLimit).toBeNull();
  });
});
