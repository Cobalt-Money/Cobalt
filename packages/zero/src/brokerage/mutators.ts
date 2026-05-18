import { defineMutator } from "@rocicorp/zero";
import type { Transaction } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import type { Schema } from "../schema.js";
import { zql } from "../schema.js";

const CASH_TICKER = "CASH";

const addManualHoldingSchema = z.object({
  accountId: z.string().uuid(),
  /** Optional ISO date YYYY-MM-DD; defaults to today. */
  dateAcquired: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Latest price per share. */
  institutionPrice: z.number().nonnegative(),
  /** Display name; falls back to ticker symbol. */
  name: z.string().min(1).max(255).optional(),
  /** Share quantity (already converted from $-mode on the client). */
  quantity: z.number().positive(),
  ticker: z.string().min(1).max(32),
});

const setCashSleeveSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().nonnegative(),
});

async function assertOwnsManualInvestmentAccount(
  tx: Transaction<Schema>,
  ctx: Context,
  accountId: string,
): Promise<void> {
  const userId = ctx?.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const row = await tx.run(zql.financialAccount.where("id", accountId).one());
  if (!row || row.userId !== userId) {
    throw new Error("Account not found");
  }
  if (row.source !== "manual" || row.type !== "investment") {
    throw new Error("Only manual investment accounts can hold positions");
  }
}

/**
 * Find or create a manual security row keyed on `(source=manual, externalId=ticker)`.
 * Mirrors the server-data `upsertManualSecurity`, but reads + inserts through
 * the Zero transaction so the optimistic write hits the local IVM cache
 * immediately.
 */
async function upsertManualSecurity(
  tx: Transaction<Schema>,
  args: {
    ticker: string;
    name?: string | null;
    isCashEquivalent?: boolean;
    currency?: string | null;
  },
): Promise<string> {
  const ticker = args.ticker.trim().toUpperCase();
  const existing = await tx.run(
    zql.security.where("source", "manual").where("externalId", ticker).one(),
  );
  if (existing) {
    return existing.id;
  }
  const securityId = crypto.randomUUID();
  await tx.mutate.security.insert({
    currency: args.currency ?? undefined,
    externalId: ticker,
    id: securityId,
    isCashEquivalent: args.isCashEquivalent ?? false,
    name: args.name ?? ticker,
    source: "manual",
    tickerSymbol: ticker,
  });
  return securityId;
}

/**
 * Recompute `balance.current` = SUM(quantity * institutionPrice) for the
 * account by reading all holdings via Zero. Mirrors the server-data path so
 * the optimistic update lines up with what the server will persist.
 */
async function recomputeAccountBalance(tx: Transaction<Schema>, accountId: string): Promise<void> {
  const holdings = await tx.run(zql.holding.where("accountId", accountId));
  let total = 0;
  for (const h of holdings) {
    const qty = Number(h.quantity);
    const price = h.institutionPrice === null ? 0 : Number(h.institutionPrice);
    if (Number.isFinite(qty) && Number.isFinite(price)) {
      total += qty * price;
    }
  }
  const bal = await tx.run(zql.balance.where("accountId", accountId).one());
  if (bal) {
    await tx.mutate.balance.update({ current: total, id: bal.id });
  }
}

export const brokerageMutators = {
  /**
   * Add a manual holding + log a BUY investmentActivity row + recompute the
   * account balance. The web app calls this for optimistic UI; the REST
   * endpoint (`POST /internal/brokerage/manual-holdings`) keeps existing for
   * mobile / external clients.
   */
  addManualHolding: defineMutator(addManualHoldingSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Unauthorized");
    }
    await assertOwnsManualInvestmentAccount(tx, ctx, args.accountId);

    const accountBalance = await tx.run(zql.balance.where("accountId", args.accountId).one());
    const currency = accountBalance?.currency ?? undefined;

    const securityId = await upsertManualSecurity(tx, {
      currency,
      name: args.name ?? null,
      ticker: args.ticker,
    });

    const ticker = args.ticker.trim().toUpperCase();
    const qty = args.quantity;
    const price = args.institutionPrice;
    const dateIso = args.dateAcquired ?? new Date().toISOString().slice(0, 10);
    /** Zero stores date columns as epoch ms. */
    const dateMs = Date.parse(`${dateIso}T00:00:00Z`);

    // Idempotent on (accountId, securityId) — second submit for the same
    // ticker overwrites the existing holding to mirror the REST endpoint.
    const existingHolding = await tx.run(
      zql.holding.where("accountId", args.accountId).where("securityId", securityId).one(),
    );

    // eslint-disable-next-line unicorn/prefer-ternary
    if (existingHolding) {
      await tx.mutate.holding.update({
        currency,
        id: existingHolding.id,
        institutionPrice: price,
        institutionPriceAsOf: dateMs,
        institutionValue: qty * price,
        lastSyncAt: Date.now(),
        quantity: qty,
      });
    } else {
      await tx.mutate.holding.insert({
        accountId: args.accountId,
        currency,
        id: crypto.randomUUID(),
        institutionPrice: price,
        institutionPriceAsOf: dateMs,
        institutionValue: qty * price,
        lastSyncAt: Date.now(),
        quantity: qty,
        securityId,
        source: "manual",
        userId: ctx.userId,
      });
    }

    await tx.mutate.investmentActivity.insert({
      accountId: args.accountId,
      amount: qty * price,
      currency,
      date: dateMs,
      id: crypto.randomUUID(),
      name: args.name ?? ticker,
      price: price,
      quantity: qty,
      securityId,
      source: "manual",
      type: "BUY",
      userId: ctx.userId,
    });

    await recomputeAccountBalance(tx, args.accountId);
  }),

  /** Set / clear the uninvested cash sleeve on a manual investment account. */
  setManualCashSleeve: defineMutator(setCashSleeveSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Unauthorized");
    }
    await assertOwnsManualInvestmentAccount(tx, ctx, args.accountId);
    const accountBalance = await tx.run(zql.balance.where("accountId", args.accountId).one());
    const currency = accountBalance?.currency ?? undefined;

    const securityId = await upsertManualSecurity(tx, {
      currency,
      isCashEquivalent: true,
      name: "Cash",
      ticker: CASH_TICKER,
    });
    const existing = await tx.run(
      zql.holding.where("accountId", args.accountId).where("securityId", securityId).one(),
    );

    if (args.amount === 0) {
      if (existing) {
        await tx.mutate.holding.delete({ id: existing.id });
      }
      await recomputeAccountBalance(tx, args.accountId);
      return;
    }

    // eslint-disable-next-line unicorn/prefer-ternary
    if (existing) {
      await tx.mutate.holding.update({
        id: existing.id,
        institutionValue: args.amount,
        lastSyncAt: Date.now(),
        quantity: args.amount,
      });
    } else {
      await tx.mutate.holding.insert({
        accountId: args.accountId,
        currency,
        id: crypto.randomUUID(),
        institutionPrice: 1,
        institutionValue: args.amount,
        lastSyncAt: Date.now(),
        quantity: args.amount,
        securityId,
        source: "manual",
        userId: ctx.userId,
      });
    }

    await recomputeAccountBalance(tx, args.accountId);
  }),
};
