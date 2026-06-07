import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq, gte, sql } from "drizzle-orm";

import { findMerchantForTransaction } from "./find.js";

/**
 * SRI-352 — Plaid txn enrichment driver.
 *
 * Pulls a user's recent in-store Plaid txns with at least one gappable field
 * (address / website / lat / lon), runs each through the canonical matcher,
 * and fills gaps respecting `lockedFields` and per-field write policy. Only
 * `exact` / `high` confidence matches write. Idempotent — already-filled
 * fields are skipped, so re-runs are no-ops.
 *
 * Returns { enriched, scanned } so callers (Plaid sync workflow step + cron
 * backfill) can surface progress in their own logs.
 */
// eslint-disable-next-line complexity
export async function enrichTransactionsForPlaidItem(
  itemId: string,
): Promise<{ enriched: number; scanned: number }> {
  const item = await db.query.plaidConnection.findFirst({
    columns: { userId: true },
    where: { plaidItemId: itemId },
  });
  if (!item) {
    return { enriched: 0, scanned: 0 };
  }
  return enrichTransactionsForUser(item.userId);
}

// eslint-disable-next-line complexity
export async function enrichTransactionsForUser(
  userId: string,
): Promise<{ enriched: number; scanned: number }> {
  const candidates = await db
    .select({
      address: transactionTable.address,
      city: transactionTable.city,
      date: transactionTable.date,
      id: transactionTable.id,
      lat: transactionTable.lat,
      lockedFields: transactionTable.lockedFields,
      lon: transactionTable.lon,
      merchantName: transactionTable.merchantName,
      name: transactionTable.name,
      paymentChannel: transactionTable.paymentChannel,
      postalCode: transactionTable.postalCode,
      region: transactionTable.region,
      storeNumber: transactionTable.storeNumber,
      website: transactionTable.website,
    })
    .from(transactionTable)
    .where(
      and(
        eq(transactionTable.userId, userId),
        eq(transactionTable.source, "plaid"),
        eq(transactionTable.paymentChannel, "in store"),
        gte(transactionTable.date, sql`current_date - interval '180 days'`),
        sql`(${transactionTable.website} IS NULL OR ${transactionTable.address} IS NULL OR ${transactionTable.lat} IS NULL OR ${transactionTable.lon} IS NULL)`,
      ),
    );

  let enriched = 0;
  for (const t of candidates) {
    if (
      t.address &&
      t.city &&
      t.region &&
      t.lat !== null &&
      t.lat !== undefined &&
      t.lon !== null &&
      t.lon !== undefined
    ) {
      continue;
    }

    const sourceName = t.merchantName ?? t.name;
    if (!sourceName) {
      continue;
    }

    const res = await findMerchantForTransaction(
      {
        address: t.address,
        city: t.city,
        date: t.date,
        lat: t.lat,
        lon: t.lon,
        name: sourceName,
        paymentChannel: "in store",
        postalCode: t.postalCode,
        region: t.region,
        storeNumber: t.storeNumber,
      },
      { userId },
    );
    if (!res || (res.confidence !== "exact" && res.confidence !== "high")) {
      continue;
    }

    const locked = (t.lockedFields ?? []) as string[];
    const lockedSet = new Set(locked);
    const set: Record<string, unknown> = {};

    if (!lockedSet.has("merchantName") && !lockedSet.has("merchant_name")) {
      if (!t.merchantName) {
        set.merchantName = res.merchant.canonicalName;
      } else if (
        (t.merchantName === t.merchantName.toUpperCase() ||
          res.merchant.canonicalName.toLowerCase().includes(t.merchantName.toLowerCase())) &&
        t.merchantName !== res.merchant.canonicalName
      ) {
        set.merchantName = res.merchant.canonicalName;
      }
    }
    if (!t.website && res.merchant.domain && !lockedSet.has("website")) {
      set.website = res.merchant.domain;
    }
    if (res.location) {
      if (!t.address && res.location.address && !lockedSet.has("address")) {
        set.address = res.location.address;
      }
      if (!t.city && res.location.city && !lockedSet.has("city")) {
        set.city = res.location.city;
      }
      if (!t.region && res.location.region && !lockedSet.has("region")) {
        set.region = res.location.region;
      }
      if (!t.postalCode && res.location.postalCode && !lockedSet.has("postalCode")) {
        set.postalCode = res.location.postalCode;
      }
      if (
        (t.lat === null || t.lat === undefined) &&
        res.location.lat !== null &&
        res.location.lat !== undefined &&
        !lockedSet.has("lat")
      ) {
        set.lat = res.location.lat;
      }
      if (
        (t.lon === null || t.lon === undefined) &&
        res.location.lon !== null &&
        res.location.lon !== undefined &&
        !lockedSet.has("lon")
      ) {
        set.lon = res.location.lon;
      }
      if (!t.storeNumber && res.location.storeNumber && !lockedSet.has("storeNumber")) {
        set.storeNumber = res.location.storeNumber;
      }
    }

    if (Object.keys(set).length === 0) {
      continue;
    }

    await db
      .update(transactionTable)
      .set({ ...set, updatedAt: new Date() })
      .where(eq(transactionTable.id, t.id));
    enriched += 1;
  }

  return { enriched, scanned: candidates.length };
}
