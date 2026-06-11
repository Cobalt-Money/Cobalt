import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { socialCategoryBlocklist } from "@cobalt-web/db/schema/social/category-blocklist";
import { socialMerchantBlocklist } from "@cobalt-web/db/schema/social/merchant-blocklist";
import { socialPost } from "@cobalt-web/db/schema/social/post";
import { socialShareSettings } from "@cobalt-web/db/schema/social/share-settings";
import { and, eq, gte, inArray, isNotNull, lte, notInArray, sql } from "drizzle-orm";

import { pfcDetailedToSystemKey } from "../categories/map.js";

export interface ShareSettings {
  shareAmount: boolean;
  shareCard: boolean;
  shareDate: boolean;
  shareMaxAmountCents: number | null;
  shareMerchant: boolean;
  shareMinAmountCents: number | null;
  shareNote: boolean;
}

const DEFAULTS: ShareSettings = {
  shareAmount: true,
  shareCard: true,
  shareDate: true,
  shareMaxAmountCents: null,
  shareMerchant: true,
  shareMinAmountCents: null,
  shareNote: false,
};

export async function getShareSettings(userId: string): Promise<ShareSettings> {
  const rows = await db
    .select({
      shareAmount: socialShareSettings.shareAmount,
      shareCard: socialShareSettings.shareCard,
      shareDate: socialShareSettings.shareDate,
      shareMaxAmountCents: socialShareSettings.shareMaxAmountCents,
      shareMerchant: socialShareSettings.shareMerchant,
      shareMinAmountCents: socialShareSettings.shareMinAmountCents,
      shareNote: socialShareSettings.shareNote,
    })
    .from(socialShareSettings)
    .where(eq(socialShareSettings.userId, userId))
    .limit(1);
  return rows[0] ?? DEFAULTS;
}

export async function upsertShareSettings(
  userId: string,
  patch: Partial<ShareSettings>,
): Promise<ShareSettings> {
  const merged = { ...DEFAULTS, ...patch };
  if (
    merged.shareMinAmountCents !== null &&
    merged.shareMaxAmountCents !== null &&
    merged.shareMinAmountCents > merged.shareMaxAmountCents
  ) {
    throw new Error("share_min_amount_cents must be <= share_max_amount_cents");
  }
  await db
    .insert(socialShareSettings)
    .values({ ...merged, userId })
    .onConflictDoUpdate({
      set: { ...merged, updatedAt: new Date() },
      target: socialShareSettings.userId,
    });
  return merged;
}

async function getBlockedMerchants(userId: string): Promise<string[]> {
  const rows = await db
    .select({ merchantName: socialMerchantBlocklist.merchantName })
    .from(socialMerchantBlocklist)
    .where(eq(socialMerchantBlocklist.userId, userId));
  return rows.map((r) => r.merchantName);
}

async function getBlockedCategories(userId: string): Promise<string[]> {
  const rows = await db
    .select({ category: socialCategoryBlocklist.category })
    .from(socialCategoryBlocklist)
    .where(eq(socialCategoryBlocklist.userId, userId));
  return rows.map((r) => r.category);
}

/**
 * Hard auto-share gate:
 *   - Plaid in-store + lat/lon present
 *   - Amount within [min, max] range (if set)
 *   - Merchant + pfc_primary not in user's blocklists
 *
 * Display fields written nullable per share settings — null = redacted.
 * Idempotent on (user_id, transaction_id).
 */
export async function autoShareInStoreTxnsForUser(userId: string): Promise<{
  inserted: number;
  scanned: number;
}> {
  const [settings, blockedMerchants, blockedCategories] = await Promise.all([
    getShareSettings(userId),
    getBlockedMerchants(userId),
    getBlockedCategories(userId),
  ]);

  const minDollars =
    settings.shareMinAmountCents === null ? null : settings.shareMinAmountCents / 100;
  const maxDollars =
    settings.shareMaxAmountCents === null ? null : settings.shareMaxAmountCents / 100;

  const candidates = await db
    .select({
      accountCustomName: financialAccount.customName,
      accountInstitutionName: financialAccount.institutionName,
      accountName: financialAccount.name,
      amount: transactionTable.amount,
      date: transactionTable.date,
      id: transactionTable.id,
      lat: transactionTable.lat,
      logoUrl: transactionTable.logoUrl,
      lon: transactionTable.lon,
      merchantName: transactionTable.merchantName,
      name: transactionTable.name,
      notes: transactionTable.notes,
      pfcDetailed: transactionTable.pfcDetailed,
      pfcPrimary: transactionTable.pfcPrimary,
      website: transactionTable.website,
    })
    .from(transactionTable)
    .innerJoin(financialAccount, eq(financialAccount.id, transactionTable.accountId))
    .where(
      and(
        eq(transactionTable.userId, userId),
        eq(transactionTable.source, "plaid"),
        eq(transactionTable.paymentChannel, "in store"),
        isNotNull(transactionTable.lat),
        isNotNull(transactionTable.lon),
        minDollars === null ? sql`TRUE` : gte(sql`ABS(${transactionTable.amount})`, minDollars),
        maxDollars === null ? sql`TRUE` : lte(sql`ABS(${transactionTable.amount})`, maxDollars),
        blockedMerchants.length > 0
          ? notInArray(transactionTable.merchantName, blockedMerchants)
          : sql`TRUE`,
        blockedCategories.length > 0
          ? sql`(${transactionTable.pfcPrimary} IS NULL OR ${transactionTable.pfcPrimary} NOT IN ${blockedCategories})`
          : sql`TRUE`,
        sql`NOT EXISTS (
          SELECT 1 FROM ${socialPost}
          WHERE ${socialPost.userId} = ${transactionTable.userId}
            AND ${socialPost.transactionId} = ${transactionTable.id}
        )`,
      ),
    );

  if (candidates.length === 0) {
    return { inserted: 0, scanned: 0 };
  }

  const rows = candidates.map((t) => ({
    amountCents: settings.shareAmount ? Math.round(Math.abs(Number(t.amount)) * 100) : null,
    cardName: settings.shareCard ? (t.accountCustomName ?? t.accountName) : null,
    categorySystemKey: pfcDetailedToSystemKey(t.pfcDetailed),
    date: settings.shareDate ? new Date(t.date) : null,
    institutionName: settings.shareCard ? t.accountInstitutionName : null,
    lat: t.lat as number,
    logoUrl: settings.shareMerchant ? (t.logoUrl ?? null) : null,
    lon: t.lon as number,
    merchantName: settings.shareMerchant ? (t.merchantName ?? t.name) : null,
    note: settings.shareNote ? (t.notes ?? null) : null,
    transactionId: t.id,
    userId,
    website: settings.shareMerchant ? (t.website ?? null) : null,
  }));

  const result = await db
    .insert(socialPost)
    .values(rows)
    .onConflictDoNothing({
      target: [socialPost.userId, socialPost.transactionId],
    })
    .returning({ id: socialPost.id });

  return { inserted: result.length, scanned: candidates.length };
}

/** Plaid-sync convenience: resolve item -> user, run for that user. */
export async function autoShareInStoreTxnsForPlaidItem(
  itemId: string,
): Promise<{ inserted: number; scanned: number }> {
  const row = await db.query.plaidConnection.findFirst({
    columns: { userId: true },
    where: { plaidItemId: { eq: itemId } },
  });
  if (!row) {
    return { inserted: 0, scanned: 0 };
  }
  return autoShareInStoreTxnsForUser(row.userId);
}

/**
 * Retroactive blocklist application. Call after adding a merchant or category
 * to a blocklist to delete already-posted social rows that match.
 */
export async function deleteSharedPostsForBlockedMerchant(
  userId: string,
  merchantName: string,
): Promise<number> {
  const txnIds = await db
    .select({ id: transactionTable.id })
    .from(transactionTable)
    .where(
      and(eq(transactionTable.userId, userId), eq(transactionTable.merchantName, merchantName)),
    );
  if (txnIds.length === 0) {
    return 0;
  }
  const result = await db
    .delete(socialPost)
    .where(
      and(
        eq(socialPost.userId, userId),
        inArray(
          socialPost.transactionId,
          txnIds.map((t) => t.id),
        ),
      ),
    )
    .returning({ id: socialPost.id });
  return result.length;
}

export async function deleteSharedPostsForBlockedCategory(
  userId: string,
  category: string,
): Promise<number> {
  const txnIds = await db
    .select({ id: transactionTable.id })
    .from(transactionTable)
    .where(and(eq(transactionTable.userId, userId), eq(transactionTable.pfcPrimary, category)));
  if (txnIds.length === 0) {
    return 0;
  }
  const result = await db
    .delete(socialPost)
    .where(
      and(
        eq(socialPost.userId, userId),
        inArray(
          socialPost.transactionId,
          txnIds.map((t) => t.id),
        ),
      ),
    )
    .returning({ id: socialPost.id });
  return result.length;
}

export async function addMerchantToBlocklist(userId: string, merchantName: string): Promise<void> {
  await db.insert(socialMerchantBlocklist).values({ merchantName, userId }).onConflictDoNothing();
  await deleteSharedPostsForBlockedMerchant(userId, merchantName);
}

export async function removeMerchantFromBlocklist(
  userId: string,
  merchantName: string,
): Promise<void> {
  await db
    .delete(socialMerchantBlocklist)
    .where(
      and(
        eq(socialMerchantBlocklist.userId, userId),
        eq(socialMerchantBlocklist.merchantName, merchantName),
      ),
    );
}

export async function addCategoryToBlocklist(userId: string, category: string): Promise<void> {
  await db.insert(socialCategoryBlocklist).values({ category, userId }).onConflictDoNothing();
  await deleteSharedPostsForBlockedCategory(userId, category);
}

export async function removeCategoryFromBlocklist(userId: string, category: string): Promise<void> {
  await db
    .delete(socialCategoryBlocklist)
    .where(
      and(
        eq(socialCategoryBlocklist.userId, userId),
        eq(socialCategoryBlocklist.category, category),
      ),
    );
}
