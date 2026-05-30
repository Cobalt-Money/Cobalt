import { defineMutator } from "@rocicorp/zero";
import type { Transaction } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import { requireOwned } from "../auth.js";
import type { Schema } from "../schema.js";
import { zql } from "../schema.js";

async function requireManualInvestmentAccount(
  tx: Transaction<Schema>,
  ctx: Context,
  accountId: string,
) {
  const { row } = await requireOwned(ctx, () =>
    tx.run(zql.financialAccount.where("id", accountId).one()),
  );
  if (row.source !== "manual" || row.type !== "investment") {
    throw new Error("Only manual investment accounts can hold positions");
  }
  return row;
}

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

const sellManualHoldingSchema = z.object({
  holdingId: z.string().uuid(),
  sellPrice: z.number().nonnegative(),
  sellQuantity: z.number().positive(),
  soldAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const deleteManualHoldingSchema = z.object({
  holdingId: z.string().uuid(),
});

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

// eslint-disable-next-line sort-keys
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
    await requireManualInvestmentAccount(tx, ctx, args.accountId);

    const accountBalance = await tx.run(zql.balance.where("accountId", args.accountId).one());
    const currency = accountBalance?.currency ?? undefined;

    const securityId = await upsertManualSecurity(tx, {
      currency,
      name: args.name ?? null,
      ticker: args.ticker,
    });

    const ticker = args.ticker.trim().toUpperCase();
    const addQty = args.quantity;
    const buyPrice = args.institutionPrice;
    const buyCost = addQty * buyPrice;
    const dateIso = args.dateAcquired ?? new Date().toISOString().slice(0, 10);
    /** Zero stores date columns as epoch ms. */
    const dateMs = Date.parse(`${dateIso}T00:00:00Z`);

    // Accumulate into the existing holding for (accountId, securityId) so
    // repeated buys of the same ticker grow the share count + cost basis
    // rather than overwriting the previous lot.
    const existingHolding = await tx.run(
      zql.holding.where("accountId", args.accountId).where("securityId", securityId).one(),
    );

    // eslint-disable-next-line unicorn/prefer-ternary
    if (existingHolding) {
      const prevQty = Number(existingHolding.quantity);
      const prevCost = Number(existingHolding.costBasis ?? 0);
      const totalQty = prevQty + addQty;
      const totalCost = prevCost + buyCost;
      await tx.mutate.holding.update({
        averagePrice: totalQty > 0 ? totalCost / totalQty : null,
        costBasis: totalCost,
        currency,
        id: existingHolding.id,
        institutionPrice: buyPrice,
        institutionPriceAsOf: dateMs,
        institutionValue: totalQty * buyPrice,
        lastSyncAt: Date.now(),
        quantity: totalQty,
      });
    } else {
      await tx.mutate.holding.insert({
        accountId: args.accountId,
        averagePrice: addQty > 0 ? buyCost / addQty : null,
        costBasis: buyCost,
        currency,
        id: crypto.randomUUID(),
        institutionPrice: buyPrice,
        institutionPriceAsOf: dateMs,
        institutionValue: buyCost,
        lastSyncAt: Date.now(),
        quantity: addQty,
        securityId,
        source: "manual",
        userId: ctx.userId,
      });
    }

    await tx.mutate.investmentActivity.insert({
      accountId: args.accountId,
      amount: buyCost,
      currency,
      date: dateMs,
      id: crypto.randomUUID(),
      name: args.name ?? ticker,
      price: buyPrice,
      quantity: addQty,
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
    await requireManualInvestmentAccount(tx, ctx, args.accountId);
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

  /**
   * SELL against an existing manual holding. Decrements quantity + cost
   * basis (average-cost method), refreshes institutionPrice to the sale
   * price, deletes the row when quantity hits 0, and logs a SELL activity
   * row. Server-side validation rejects oversells.
   */
  // eslint-disable-next-line complexity
  sellManualHolding: defineMutator(sellManualHoldingSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Unauthorized");
    }
    const existing = await tx.run(zql.holding.where("id", args.holdingId).one());
    if (!existing || existing.userId !== ctx.userId || existing.source !== "manual") {
      throw new Error("Holding not found");
    }
    const prevQty = Number(existing.quantity);
    if (args.sellQuantity > prevQty) {
      throw new Error(`Cannot sell ${args.sellQuantity} — only ${prevQty} held`);
    }
    const avgPrice = Number(existing.averagePrice ?? 0);
    const prevCost = Number(existing.costBasis ?? 0);
    const newQty = prevQty - args.sellQuantity;
    const newCost = Math.max(0, prevCost - avgPrice * args.sellQuantity);
    const soldAtIso = args.soldAt ?? new Date().toISOString().slice(0, 10);
    const soldAtMs = Date.parse(`${soldAtIso}T00:00:00Z`);

    // eslint-disable-next-line unicorn/prefer-ternary
    if (newQty === 0) {
      await tx.mutate.holding.delete({ id: existing.id });
    } else {
      await tx.mutate.holding.update({
        costBasis: newCost,
        id: existing.id,
        institutionPrice: args.sellPrice,
        institutionPriceAsOf: soldAtMs,
        institutionValue: newQty * args.sellPrice,
        lastSyncAt: Date.now(),
        quantity: newQty,
      });
    }

    await tx.mutate.investmentActivity.insert({
      accountId: existing.accountId,
      amount: args.sellQuantity * args.sellPrice,
      date: soldAtMs,
      id: crypto.randomUUID(),
      name: "Sell",
      price: args.sellPrice,
      quantity: args.sellQuantity,
      securityId: existing.securityId,
      source: "manual",
      type: "SELL",
      userId: ctx.userId,
    });

    await recomputeAccountBalance(tx, existing.accountId);
  }),

  /** Delete a manual holding row outright. Activity history rows stay. */
  deleteManualHolding: defineMutator(deleteManualHoldingSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Unauthorized");
    }
    const existing = await tx.run(zql.holding.where("id", args.holdingId).one());
    if (!existing || existing.userId !== ctx.userId || existing.source !== "manual") {
      throw new Error("Holding not found");
    }
    await tx.mutate.holding.delete({ id: existing.id });
    await recomputeAccountBalance(tx, existing.accountId);
  }),
};
