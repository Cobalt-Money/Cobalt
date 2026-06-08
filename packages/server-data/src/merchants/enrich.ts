import { randomUUID } from "node:crypto";

import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { and, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";

import { logEnrichmentEvent } from "./audit.js";
import { findMerchantForTransaction } from "./find.js";
import type { MatchResult } from "./find.js";

/**
 * SRI-353 — Plaid txn enrichment driver (rewritten).
 *
 * Pre-filter (server-side): only Plaid in-store txns in NY/CA whose
 * `pfc_primary = 'FOOD_AND_DRINK'`. Transit / ATM / bank-transfer / hospital
 * rows are excluded at the SQL level, so the matcher never sees them.
 *
 * Per-field writes respect `lockedFields` (user edits never overwritten).
 * Location-field writes (address/city/region/postal/lat/lon/storeNumber)
 * require `res.location !== null` — proves a physical anchor matched
 * (geo / address / store# / single-hit city+region). Brand-only matches
 * still update `merchant_name` + `website` but never invent a location.
 *
 * Every write is appended to `enrichment_event` with the `runId`, so a
 * regression can be rolled back by `runId` and rows can be traced per-txn.
 */
const ENRICHABLE_REGIONS = ["NY", "CA"] as const;
const ENRICHABLE_PFC = ["FOOD_AND_DRINK"] as const;

const LOCATION_FIELDS = ["address", "city", "region", "postalCode", "lat", "lon", "storeNumber"];
const LOCATION_LOCK_ALIASES: Record<string, string[]> = {
  address: ["address", "location"],
  city: ["city", "location"],
  lat: ["lat", "location"],
  lon: ["lon", "location"],
  postalCode: ["postalCode", "postal_code", "location"],
  region: ["region", "location"],
  storeNumber: ["storeNumber", "store_number", "location"],
};

interface CandidateRow {
  id: string;
  name: string;
  merchantName: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  lat: number | null;
  lon: number | null;
  storeNumber: string | null;
  date: string;
  lockedFields: string[];
}

export async function enrichTransactionsForPlaidItem(
  itemId: string,
): Promise<{ enriched: number; scanned: number; runId: string }> {
  const item = await db.query.plaidConnection.findFirst({
    columns: { userId: true },
    where: { plaidItemId: itemId },
  });
  if (!item) {
    return { enriched: 0, runId: randomUUID(), scanned: 0 };
  }
  return enrichTransactionsForUser(item.userId);
}

// eslint-disable-next-line complexity
export async function enrichTransactionsForUser(
  userId: string,
): Promise<{ enriched: number; scanned: number; runId: string }> {
  const runId = randomUUID();

  const candidates: CandidateRow[] = (await db
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
        inArray(transactionTable.region, [...ENRICHABLE_REGIONS]),
        inArray(transactionTable.pfcPrimary, [...ENRICHABLE_PFC]),
        gte(transactionTable.date, sql`current_date - interval '180 days'`),
        // Anchor-required: matcher branches all need at least one of these.
        or(
          isNotNull(transactionTable.lat),
          isNotNull(transactionTable.address),
          isNotNull(transactionTable.storeNumber),
          and(isNotNull(transactionTable.city), isNotNull(transactionTable.region)),
        )!,
      ),
    )) as CandidateRow[];

  let enriched = 0;
  for (const t of candidates) {
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

    const writes = buildWrites(t, res);
    if (Object.keys(writes.set).length === 0) {
      continue;
    }

    // Atomic: a row that gets updated WITHOUT an audit log entry can't be
    // rolled back by runId, which is the core safety contract here.
    await db.transaction(async (tx) => {
      await tx
        .update(transactionTable)
        .set({ ...writes.set, updatedAt: new Date() })
        .where(eq(transactionTable.id, t.id));
      await logEnrichmentEvent(
        {
          brandId: res.merchant.id,
          fieldsWritten: writes.diff,
          locationId: res.location?.id ?? null,
          matchReason: res.reason,
          runId,
          sim: res.sim,
          transactionId: t.id,
        },
        tx,
      );
    });

    enriched += 1;
  }

  return { enriched, runId, scanned: candidates.length };
}

/**
 * Build the UPDATE SET clause + a per-field `{old, new}` diff for the audit
 * log. Skips locked fields (per `lockedFields`), Plaid-already-filled fields
 * (Plaid is ground truth for fields it sent), and any field where the
 * matcher didn't produce a value. Location fields require `res.location`.
 */
function buildWrites(
  t: CandidateRow,
  res: MatchResult,
): {
  set: Record<string, unknown>;
  diff: Record<string, { old: unknown; new: unknown }>;
} {
  const set: Record<string, unknown> = {};
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  const locked = t.lockedFields ? new Set(t.lockedFields) : new Set<string>();

  const tryWrite = (
    field: string,
    currentValue: unknown,
    newValue: unknown,
    lockKeys: string[] = [field],
  ) => {
    if (newValue === null || newValue === undefined || newValue === "") {
      return;
    }
    if (currentValue === newValue) {
      return;
    }
    if (lockKeys.some((k) => locked.has(k))) {
      return;
    }
    set[field] = newValue;
    diff[field] = { new: newValue, old: currentValue };
  };

  // Brand fields — fill when Plaid sent null, or promote uppercase/abbreviated
  // names to the cleaner canonical form when matcher's name is a superset.
  if (!t.merchantName) {
    tryWrite("merchantName", t.merchantName, res.merchant.canonicalName, [
      "merchantName",
      "merchant_name",
    ]);
  } else if (
    (t.merchantName === t.merchantName.toUpperCase() ||
      res.merchant.canonicalName.toLowerCase().includes(t.merchantName.toLowerCase())) &&
    t.merchantName !== res.merchant.canonicalName
  ) {
    tryWrite("merchantName", t.merchantName, res.merchant.canonicalName, [
      "merchantName",
      "merchant_name",
    ]);
  }
  if (!t.website) {
    // `website` is co-locked with `merchantName` via LOCK_KEY_GUARDED_COLUMNS.
    tryWrite("website", t.website, res.merchant.domain, ["website", "merchantName"]);
  }

  // Location fields — only when res.location is set, and only fill gaps.
  // Plaid-provided values are ground truth: we never overwrite a non-null
  // Plaid field even if the matcher disagrees. brand_only matches never get
  // here, so the singleton-style location fabrication can't happen.
  if (res.location) {
    for (const field of LOCATION_FIELDS) {
      const current = (t as unknown as Record<string, unknown>)[field];
      if (current !== null && current !== undefined) {
        continue;
      }
      const next = (res.location as unknown as Record<string, unknown>)[field];
      tryWrite(field, current, next, LOCATION_LOCK_ALIASES[field] ?? [field]);
    }
  }

  return { diff, set };
}
