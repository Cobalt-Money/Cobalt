import { db } from "@cobalt-web/db";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { holding } from "@cobalt-web/db/schema/accounts/investments/holding";
import { investmentActivity } from "@cobalt-web/db/schema/accounts/investments/investment-activity";
import { security } from "@cobalt-web/db/schema/accounts/investments/security";
import { and, eq, sql } from "drizzle-orm";

import { ApiError } from "../../_shared/api-error.js";
import type {
  CreateManualHoldingBody,
  SellManualHoldingBody,
  UpdateManualHoldingBody,
} from "./schemas.js";

const MANUAL_SOURCE = "manual" as const;
const CASH_TICKER = "CASH";

interface OwnedAccount {
  id: string;
  userId: string;
  currency: string | null;
}

async function getOwnedManualInvestmentAccount(
  accountId: string,
  userId: string,
): Promise<OwnedAccount> {
  const row = await db.query.financialAccount.findFirst({
    columns: { id: true, userId: true },
    where: {
      id: { eq: accountId },
      source: { eq: MANUAL_SOURCE },
      type: { eq: "investment" },
      userId: { eq: userId },
    },
  });
  if (!row) {
    throw new ApiError(404, "account_not_found", "Account not found");
  }
  const bal = await db.query.balance.findFirst({
    columns: { currency: true },
    where: { accountId: { eq: row.id } },
  });
  return { currency: bal?.currency ?? null, id: row.id, userId: row.userId };
}

async function getOwnedHolding(holdingId: string, userId: string) {
  const row = await db.query.holding.findFirst({
    columns: {
      accountId: true,
      id: true,
      securityId: true,
      source: true,
      userId: true,
    },
    where: { id: { eq: holdingId } },
  });
  if (!row || row.userId !== userId || row.source !== MANUAL_SOURCE) {
    throw new ApiError(404, "holding_not_found", "Holding not found");
  }
  return row;
}

/**
 * Upsert a manual security keyed on ticker. Shared across users — the unique
 * index is (source, external_id), so AAPL/manual is one global row.
 */
async function upsertManualSecurity(args: {
  ticker: string;
  name?: string | null;
  isCashEquivalent?: boolean;
  currency?: string | null;
}): Promise<string> {
  const ticker = args.ticker.trim().toUpperCase();
  const [row] = await db
    .insert(security)
    .values({
      currency: args.currency ?? null,
      externalId: ticker,
      isCashEquivalent: args.isCashEquivalent ?? false,
      name: args.name ?? ticker,
      source: MANUAL_SOURCE,
      tickerSymbol: ticker,
    })
    .onConflictDoUpdate({
      set: {
        name: sql`coalesce(excluded.name, ${security.name})`,
        tickerSymbol: sql`excluded.ticker_symbol`,
        updatedAt: new Date(),
      },
      target: [security.source, security.externalId],
      targetWhere: sql`external_id IS NOT NULL`,
    })
    .returning({ id: security.id });
  if (!row) {
    throw new ApiError(500, "security_upsert_failed", "Failed to upsert security");
  }
  return row.id;
}

/**
 * Recompute `balance.current` for a manual investment account from its
 * holdings: SUM(quantity * institutionPrice). Treats missing price as 0 so a
 * half-filled position contributes nothing rather than corrupting the total.
 */
async function recomputeAccountBalance(accountId: string): Promise<void> {
  const rows = await db
    .select({
      institutionPrice: holding.institutionPrice,
      quantity: holding.quantity,
    })
    .from(holding)
    .where(eq(holding.accountId, accountId));
  let total = 0;
  for (const r of rows) {
    const qty = Number(r.quantity);
    const price = r.institutionPrice === null ? 0 : Number(r.institutionPrice);
    if (Number.isFinite(qty) && Number.isFinite(price)) {
      total += qty * price;
    }
  }
  await db
    .update(balance)
    .set({ current: total.toFixed(4) })
    .where(eq(balance.accountId, accountId));
}

/**
 * Accumulate a new buy lot into the existing holding for
 * (accountId, securityId), or insert fresh if none. Returns the holding id.
 */
async function upsertAccumulatedHolding(args: {
  accountId: string;
  userId: string;
  securityId: string;
  addQty: number;
  buyPrice: number;
  buyCost: number;
  currency: string | null;
  institutionPriceAsOf: string | null;
}): Promise<string> {
  const existing = await db.query.holding.findFirst({
    columns: { costBasis: true, id: true, quantity: true },
    where: {
      accountId: { eq: args.accountId },
      securityId: { eq: args.securityId },
    },
  });
  if (existing) {
    const totalQty = Number(existing.quantity) + args.addQty;
    const totalCost = Number(existing.costBasis ?? "0") + args.buyCost;
    const avg = totalQty > 0 ? totalCost / totalQty : null;
    await db
      .update(holding)
      .set({
        averagePrice: avg === null ? null : avg.toFixed(10),
        costBasis: totalCost.toFixed(4),
        currency: args.currency,
        institutionPrice: args.buyPrice.toFixed(10),
        institutionPriceAsOf: args.institutionPriceAsOf,
        institutionValue: (totalQty * args.buyPrice).toFixed(4),
        lastSyncAt: new Date(),
        quantity: totalQty.toFixed(10),
        updatedAt: new Date(),
      })
      .where(eq(holding.id, existing.id));
    return existing.id;
  }
  const avg = args.addQty > 0 ? args.buyCost / args.addQty : null;
  const [row] = await db
    .insert(holding)
    .values({
      accountId: args.accountId,
      averagePrice: avg === null ? null : avg.toFixed(10),
      costBasis: args.buyCost.toFixed(4),
      currency: args.currency,
      institutionPrice: args.buyPrice.toFixed(10),
      institutionPriceAsOf: args.institutionPriceAsOf,
      institutionValue: (args.addQty * args.buyPrice).toFixed(4),
      lastSyncAt: new Date(),
      quantity: args.addQty.toFixed(10),
      securityId: args.securityId,
      source: MANUAL_SOURCE,
      userId: args.userId,
    })
    .returning({ id: holding.id });
  if (!row) {
    throw new ApiError(500, "holding_insert_failed", "Failed to insert holding");
  }
  return row.id;
}

export async function createManualHolding(
  userId: string,
  input: CreateManualHoldingBody,
): Promise<{ holdingId: string }> {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new ApiError(400, "invalid_quantity", "Quantity must be > 0");
  }
  if (!Number.isFinite(input.institutionPrice) || input.institutionPrice < 0) {
    throw new ApiError(400, "invalid_price", "Price must be ≥ 0");
  }
  const account = await getOwnedManualInvestmentAccount(input.accountId, userId);
  const securityId = await upsertManualSecurity({
    currency: input.currency ?? account.currency,
    name: input.name ?? null,
    ticker: input.ticker,
  });

  const addQty = input.quantity;
  const buyPrice = input.institutionPrice;
  /** Cost of THIS buy. If user didn't supply one, derive from price × qty. */
  const buyCost = input.costBasis ?? addQty * buyPrice;
  const holdingId = await upsertAccumulatedHolding({
    accountId: account.id,
    addQty,
    buyCost,
    buyPrice,
    currency: input.currency ?? account.currency,
    institutionPriceAsOf: input.institutionPriceAsOf ?? null,
    securityId,
    userId,
  });

  // Log a BUY activity row per submission (one per buy lot). Activity rows
  // are NOT collapsed across submissions — the feed keeps each buy distinct
  // even though the holding row aggregates.
  const activityDate = input.institutionPriceAsOf ?? new Date().toISOString().slice(0, 10);
  await db.insert(investmentActivity).values({
    accountId: account.id,
    amount: buyCost.toFixed(4),
    currency: input.currency ?? account.currency,
    date: activityDate,
    name: input.name ?? input.ticker.trim().toUpperCase(),
    price: buyPrice.toFixed(10),
    quantity: addQty.toFixed(10),
    securityId,
    source: MANUAL_SOURCE,
    type: "BUY",
    userId,
  });

  await recomputeAccountBalance(account.id);
  return { holdingId };
}

export async function updateManualHolding(
  userId: string,
  holdingId: string,
  patch: UpdateManualHoldingBody,
): Promise<void> {
  const existing = await getOwnedHolding(holdingId, userId);
  const current = await db.query.holding.findFirst({
    columns: { institutionPrice: true, quantity: true },
    where: { id: { eq: holdingId } },
  });
  if (!current) {
    throw new ApiError(404, "holding_not_found", "Holding not found");
  }

  if (patch.quantity !== undefined && (!Number.isFinite(patch.quantity) || patch.quantity <= 0)) {
    throw new ApiError(400, "invalid_quantity", "Quantity must be > 0");
  }
  if (
    patch.institutionPrice !== undefined &&
    (!Number.isFinite(patch.institutionPrice) || patch.institutionPrice < 0)
  ) {
    throw new ApiError(400, "invalid_price", "Price must be ≥ 0");
  }

  const nextQty = patch.quantity ?? Number(current.quantity);
  const nextPrice = patch.institutionPrice ?? Number(current.institutionPrice ?? "0");

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.quantity !== undefined) {
    update.quantity = patch.quantity.toFixed(10);
  }
  if (patch.institutionPrice !== undefined) {
    update.institutionPrice = patch.institutionPrice.toFixed(10);
  }
  if (patch.institutionPriceAsOf !== undefined) {
    update.institutionPriceAsOf = patch.institutionPriceAsOf;
  }
  if (patch.costBasis !== undefined) {
    update.costBasis = patch.costBasis === null ? null : patch.costBasis.toFixed(4);
    const cb = patch.costBasis;
    update.averagePrice = cb !== null && nextQty > 0 ? (cb / nextQty).toFixed(10) : null;
  }
  if (patch.quantity !== undefined || patch.institutionPrice !== undefined) {
    update.institutionValue = (nextQty * nextPrice).toFixed(4);
  }

  await db.update(holding).set(update).where(eq(holding.id, holdingId));
  await recomputeAccountBalance(existing.accountId);
}

export async function deleteManualHolding(userId: string, holdingId: string): Promise<void> {
  const existing = await getOwnedHolding(holdingId, userId);
  await db.delete(holding).where(eq(holding.id, holdingId));
  await recomputeAccountBalance(existing.accountId);
}

/**
 * Record a SELL against a manual holding:
 *  - Validates sellQuantity ≤ existing quantity (server-side anti-oversell).
 *  - Decrements quantity; reduces costBasis proportionally so averagePrice
 *    stays constant for the remaining lot (average-cost method).
 *  - Refreshes institutionPrice + institutionValue to reflect the sale price
 *    (a recent market reference for the row).
 *  - Deletes the holding row when quantity hits 0.
 *  - Inserts a SELL investmentActivity row (amount = sellQty × sellPrice).
 *  - Recomputes balance.current.
 *
 * Realized P&L is NOT stored explicitly — it's derivable from the SELL row
 * (sellPrice) vs the holding's averagePrice at sale time, but recording it
 * separately is deferred to a future schema column.
 */
// eslint-disable-next-line complexity
export async function sellManualHolding(
  userId: string,
  input: SellManualHoldingBody,
): Promise<void> {
  if (!Number.isFinite(input.sellQuantity) || input.sellQuantity <= 0) {
    throw new ApiError(400, "invalid_quantity", "Sell quantity must be > 0");
  }
  if (!Number.isFinite(input.sellPrice) || input.sellPrice < 0) {
    throw new ApiError(400, "invalid_price", "Sell price must be ≥ 0");
  }
  const owned = await getOwnedHolding(input.holdingId, userId);
  const current = await db.query.holding.findFirst({
    columns: { averagePrice: true, costBasis: true, quantity: true },
    where: { id: { eq: input.holdingId } },
  });
  if (!current) {
    throw new ApiError(404, "holding_not_found", "Holding not found");
  }

  const prevQty = Number(current.quantity);
  if (input.sellQuantity > prevQty) {
    throw new ApiError(400, "oversell", `Cannot sell ${input.sellQuantity} — only ${prevQty} held`);
  }
  const avgPrice = Number(current.averagePrice ?? "0");
  const prevCost = Number(current.costBasis ?? "0");
  const newQty = prevQty - input.sellQuantity;
  // Average-cost method — costBasis shrinks by avgPrice × sellQty so the
  // per-share average stays the same on whatever's left.
  const newCost = Math.max(0, prevCost - avgPrice * input.sellQuantity);

  // eslint-disable-next-line unicorn/prefer-ternary
  if (newQty === 0) {
    await db.delete(holding).where(eq(holding.id, input.holdingId));
  } else {
    await db
      .update(holding)
      .set({
        costBasis: newCost.toFixed(4),
        institutionPrice: input.sellPrice.toFixed(10),
        institutionPriceAsOf: input.soldAt ?? null,
        institutionValue: (newQty * input.sellPrice).toFixed(4),
        lastSyncAt: new Date(),
        quantity: newQty.toFixed(10),
        updatedAt: new Date(),
      })
      .where(eq(holding.id, input.holdingId));
  }

  const soldAt = input.soldAt ?? new Date().toISOString().slice(0, 10);
  await db.insert(investmentActivity).values({
    accountId: owned.accountId,
    amount: (input.sellQuantity * input.sellPrice).toFixed(4),
    date: soldAt,
    name: "Sell",
    price: input.sellPrice.toFixed(10),
    quantity: input.sellQuantity.toFixed(10),
    securityId: owned.securityId,
    source: MANUAL_SOURCE,
    type: "SELL",
    userId,
  });

  await recomputeAccountBalance(owned.accountId);
}

/**
 * Set the uninvested cash sleeve on a manual investment account. Modeled as a
 * holding of a CASH-equivalent synthetic security, matching how Plaid and
 * SnapTrade represent broker cash positions.
 */
export async function setManualCashSleeve(
  userId: string,
  accountId: string,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new ApiError(400, "invalid_amount", "Amount must be ≥ 0");
  }
  const account = await getOwnedManualInvestmentAccount(accountId, userId);
  const securityId = await upsertManualSecurity({
    currency: account.currency,
    isCashEquivalent: true,
    name: "Cash",
    ticker: CASH_TICKER,
  });

  // Treat 0 as removal — keeps balance recompute clean.
  if (amount === 0) {
    await db
      .delete(holding)
      .where(and(eq(holding.accountId, account.id), eq(holding.securityId, securityId)));
    await recomputeAccountBalance(account.id);
    return;
  }

  await db
    .insert(holding)
    .values({
      accountId: account.id,
      currency: account.currency,
      institutionPrice: "1.0000000000",
      institutionValue: amount.toFixed(4),
      lastSyncAt: new Date(),
      quantity: amount.toFixed(10),
      securityId,
      source: MANUAL_SOURCE,
      userId,
    })
    .onConflictDoUpdate({
      set: {
        institutionValue: sql`excluded.institution_value`,
        lastSyncAt: sql`excluded.last_sync_at`,
        quantity: sql`excluded.quantity`,
        updatedAt: new Date(),
      },
      target: [holding.accountId, holding.securityId],
    });

  await recomputeAccountBalance(account.id);
}
