import { randomUUID } from "node:crypto";

import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import type { CATEGORY_MAPPING } from "@cobalt-web/server-data/categories/labels";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

import { logEnrichmentEvent } from "./audit.js";
import type { MatchResult } from "./find.js";
import { findPlaceForTransaction } from "./find.js";

type PfcPrimary = keyof typeof CATEGORY_MAPPING;

/**
 * SRI-354 — Plaid txn enrichment driver against the `place` table.
 *
 * Pre-filter: Plaid in-store txns with `pfc_primary = FOOD_AND_DRINK` and at
 * least one location anchor (lat/lon, address, store_number, or city+region).
 * Last 180 days only — old txns aren't worth the matcher cost. Region filter
 * dropped vs SRI-352: Overture covers all 50 states, so no reason to gate.
 *
 * Plaid's `FOOD_AND_DRINK` primary covers both restaurants and groceries
 * (groceries are `FOOD_AND_DRINK_GROCERIES` under it), so one PFC primary
 * matches the food + retail-food slice the Overture importer pulled.
 *
 * Match → write `place_id` + `place_match_confidence` + per-field fills.
 * `lockedFields` blocks per-field overwrite; Plaid-non-null fields are ground
 * truth (matcher never overwrites). Confidence floor of 0.65 — below that
 * the matcher is guessing, skip.
 *
 * Every UPDATE pairs with an `enrichment_event` row in the same transaction,
 * so bulk rollback by `runId` is always safe.
 */
const ENRICHABLE_PFC: PfcPrimary[] = ["FOOD_AND_DRINK"];
const CONFIDENCE_FLOOR = 0.65;

const LOCATION_FIELDS = [
  "address",
  "city",
  "region",
  "postalCode",
  "lat",
  "lon",
  "storeNumber",
] as const;

// Lock alias = every label a user might have set in `transaction.lockedFields`
// for this column: the camelCase column key, its snake_case form (legacy
// front-end writers), and the shared "location" group alias.
const toSnake = (s: string) => s.replaceAll(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const LOCATION_LOCK_ALIASES: Record<string, string[]> = Object.fromEntries(
  LOCATION_FIELDS.map((f) => [f, [...new Set([f, toSnake(f), "location"])]]),
);

type CandidateRow = Pick<
  typeof transactionTable.$inferSelect,
  | "id"
  | "name"
  | "merchantName"
  | "website"
  | "logoUrl"
  | "address"
  | "city"
  | "region"
  | "postalCode"
  | "lat"
  | "lon"
  | "storeNumber"
  | "placeId"
  | "placeMatchConfidence"
  | "date"
  | "lockedFields"
>;

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
      logoUrl: transactionTable.logoUrl,
      lon: transactionTable.lon,
      merchantName: transactionTable.merchantName,
      name: transactionTable.name,
      placeId: transactionTable.placeId,
      placeMatchConfidence: transactionTable.placeMatchConfidence,
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
        inArray(transactionTable.pfcPrimary, [...ENRICHABLE_PFC]),
        or(
          isNotNull(transactionTable.lat),
          isNotNull(transactionTable.address),
          isNotNull(transactionTable.storeNumber),
          and(isNotNull(transactionTable.city), isNotNull(transactionTable.region)),
        ) ?? sql`true`,
      ),
    )) as CandidateRow[];

  let enriched = 0;
  for (const t of candidates) {
    const sourceName = t.merchantName ?? t.name;
    if (!sourceName) {
      continue;
    }

    const res = await findPlaceForTransaction({
      address: t.address,
      city: t.city,
      lat: t.lat,
      lon: t.lon,
      name: sourceName,
      postalCode: t.postalCode,
      region: t.region,
      storeNumber: t.storeNumber,
    });
    if (!res || res.confidence < CONFIDENCE_FLOOR) {
      continue;
    }

    const writes = buildWrites(t, res);
    if (Object.keys(writes.set).length === 0) {
      continue;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(transactionTable)
        .set({ ...writes.set, updatedAt: new Date() })
        .where(eq(transactionTable.id, t.id));
      await logEnrichmentEvent(
        {
          fieldsWritten: writes.diff,
          matchConfidence: res.confidence,
          matchReason: res.reason,
          placeId: res.place.id,
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
 * Build the UPDATE SET clause + `{old, new}` diff for the audit log. Skips
 * locked fields, Plaid-non-null fields (Plaid is ground truth), and any
 * field the matcher didn't produce. Always writes `place_id` + confidence
 * even if no other column changes — those are the matcher's signature.
 */
// eslint-disable-next-line complexity
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

  // Pin the matcher's choice + confidence — but only when they'd actually
  // change. Unconditional writes turned every re-run into a no-op "enrich"
  // that still bumped updated_at + appended an audit row (SRI-354 idempotency
  // regression). Keep writes diff-driven so `enriched: 0` on a stable re-run.
  if (t.placeId !== res.place.id) {
    set["placeId"] = res.place.id;
    diff["placeId"] = { new: res.place.id, old: t.placeId };
  }
  // Drizzle returns `numeric` columns as strings preserving column scale
  // ("0.8500" for numeric(5,4)), so a raw `!==` against `String(res.confidence)`
  // ("0.85") falsely flags a diff every run. Compare as numbers.
  const currentConfidence = t.placeMatchConfidence === null ? null : Number(t.placeMatchConfidence);
  if (currentConfidence === null || Math.abs(currentConfidence - res.confidence) > 1e-4) {
    set["placeMatchConfidence"] = String(res.confidence);
    diff["placeMatchConfidence"] = {
      new: res.confidence,
      old: t.placeMatchConfidence,
    };
  }

  // Brand fields — fill gaps or promote uppercase/abbreviated to canonical.
  if (!t.merchantName) {
    tryWrite("merchantName", t.merchantName, res.place.brandName, [
      "merchantName",
      "merchant_name",
    ]);
  } else if (
    (t.merchantName === t.merchantName.toUpperCase() ||
      res.place.brandName.toLowerCase().includes(t.merchantName.toLowerCase())) &&
    t.merchantName !== res.place.brandName
  ) {
    tryWrite("merchantName", t.merchantName, res.place.brandName, [
      "merchantName",
      "merchant_name",
    ]);
  }
  if (!t.website) {
    tryWrite("website", t.website, res.place.brandDomain, ["website", "merchantName"]);
  }
  if (!t.logoUrl) {
    tryWrite("logoUrl", t.logoUrl, res.place.brandLogoUrl, ["logoUrl", "logo_url"]);
  }

  // Location fields — fill only when Plaid sent null. Plaid-non-null is
  // ground truth even when the matcher disagrees.
  for (const field of LOCATION_FIELDS) {
    const current = (t as unknown as Record<string, unknown>)[field];
    if (current !== null && current !== undefined) {
      continue;
    }
    const next = (res.place as unknown as Record<string, unknown>)[field];
    tryWrite(field, current, next, LOCATION_LOCK_ALIASES[field] ?? [field]);
  }

  return { diff, set };
}
