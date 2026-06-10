/**
 * SRI-354 — DB-level integration suite for the places matcher + enrichment
 * pipeline. Covers every match branch, every false-positive guard, and the
 * write-policy invariants (skip non-null Plaid, respect lockedFields,
 * idempotent re-run, audit events paired to the same `runId`).
 *
 * Layered as:
 *   1. `findPlaceForTransaction` — pure matcher, asserts branch routing +
 *      confidence floors + Raja-class regression guards.
 *   2. `enrichTransactionsForUser` — full pipeline, asserts what gets written
 *      back onto `transaction`, plus `enrichment_event` audit shape.
 *
 * Fixture seeding uses raw SQL throughout because `workflow/vite` (the
 * integration vitest plugin) can't transform the `enrichmentSchema.table(...)`
 * pattern used by `packages/db/src/schema/places/place.ts` and anything that
 * transitively imports it (notably `transaction.ts`).
 *
 * Each test owns a unique `(source, source_id)` namespace so parallel runs
 * don't collide. Fixtures torn down per-test.
 */
import { afterAll, beforeAll, afterEach, describe, expect, it } from "vitest";

import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { enrichTransactionsForUser } from "@cobalt-web/server-data/places/enrich";
import { findPlaceForTransaction } from "@cobalt-web/server-data/places/find";
import { eq, sql } from "drizzle-orm";

const TEST_USER_ID = "00000000-0000-4000-8000-0000000003fa";
const SOURCE_TAG = `test-enrich-${Date.now()}`;

let TEST_ACCOUNT_ID = "";

function compact(s: string): string {
  return s.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}
function normalized(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/[^a-z0-9 ]/g, "")
    .trim();
}

interface SeedPlace {
  sourceId: string;
  brandName: string;
  address: string;
  city: string;
  region: string;
  postalCode?: string;
  lat?: number;
  lon?: number;
  storeNumber?: string;
  brandDomain?: string;
  category?: string;
  source?: string;
}

async function seedPlace(p: SeedPlace): Promise<string> {
  const result = await db.execute(sql`
    INSERT INTO enrichment.place
      (address, brand_domain, brand_key, brand_name, brand_name_compact,
       brand_name_normalized, category, city, country, lat, lon, postal_code,
       raw_name, region, source, source_id, store_number)
    VALUES
      (${p.address}, ${p.brandDomain ?? null}, ${compact(p.brandName)},
       ${p.brandName}, ${compact(p.brandName)}, ${normalized(p.brandName)},
       ${p.category ?? "restaurant"}, ${p.city}, 'US',
       ${p.lat ?? null}, ${p.lon ?? null}, ${p.postalCode ?? null},
       ${p.brandName}, ${p.region}, ${p.source ?? SOURCE_TAG}, ${p.sourceId},
       ${p.storeNumber ?? null})
    RETURNING id::text
  `);
  const rows = result.rows ?? (result as unknown as { rows?: { id: string }[] }).rows ?? [];
  const id = (rows[0] as { id: string } | undefined)?.id;
  if (!id) {
    throw new Error("seedPlace failed");
  }
  return id;
}

interface SeedTxn {
  name: string;
  merchantName?: string | null;
  paymentChannel?: string | null;
  pfcPrimary?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  lat?: number | null;
  lon?: number | null;
  storeNumber?: string | null;
  lockedFields?: string[];
}

async function seedTxn(t: SeedTxn): Promise<string> {
  const lockedFieldsJson = JSON.stringify(t.lockedFields ?? []);
  const result = await db.execute(sql`
    INSERT INTO public.transaction
      (account_id, address, amount, city, date, lat, locked_fields, lon,
       merchant_name, name, payment_channel, pfc_primary, postal_code, region,
       source, store_number, user_id)
    VALUES
      (${TEST_ACCOUNT_ID}::uuid, ${t.address ?? null}, '10.00',
       ${t.city ?? null}, CURRENT_DATE,
       ${t.lat ?? null}, ${lockedFieldsJson}::jsonb, ${t.lon ?? null},
       ${t.merchantName ?? null}, ${t.name},
       ${t.paymentChannel ?? "in store"}, ${t.pfcPrimary ?? "FOOD_AND_DRINK"},
       ${t.postalCode ?? null}, ${t.region ?? null},
       'plaid', ${t.storeNumber ?? null}, ${TEST_USER_ID})
    RETURNING id::text
  `);
  const rows = result.rows ?? (result as unknown as { rows?: { id: string }[] }).rows ?? [];
  const id = (rows[0] as { id: string } | undefined)?.id;
  if (!id) {
    throw new Error("seedTxn failed");
  }
  return id;
}

interface TxnRow {
  place_id: string | null;
  place_match_confidence: string | null;
  address: string | null;
  city: string | null;
  merchant_name: string | null;
  website: string | null;
}

async function getTxn(id: string): Promise<TxnRow | null> {
  const result = await db.execute(sql`
    SELECT place_id::text, place_match_confidence::text, address, city, merchant_name, website
    FROM public.transaction WHERE id = ${id}::uuid
  `);
  const rows = result.rows ?? (result as unknown as { rows?: TxnRow[] }).rows ?? [];
  return (rows[0] as TxnRow | undefined) ?? null;
}

interface EnrichmentEventRow {
  match_reason: string;
  place_id: string | null;
  match_confidence: string;
}

async function getEnrichmentEvents(runId: string): Promise<EnrichmentEventRow[]> {
  const result = await db.execute(sql`
    SELECT match_reason, place_id::text, match_confidence::text
    FROM enrichment.enrichment_event WHERE run_id = ${runId}::uuid
  `);
  const rows = result.rows ?? (result as unknown as { rows?: EnrichmentEventRow[] }).rows ?? [];
  return rows as unknown as EnrichmentEventRow[];
}

async function ensureUser(): Promise<void> {
  await db.execute(sql`
    INSERT INTO "user" (id, email, name, email_verified, created_at, updated_at)
    VALUES (${TEST_USER_ID}, 'enrich-integration@test.local',
            'EnrichIntegration', false, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `);
}

async function ensureAccount(): Promise<void> {
  const [conn] = await db
    .insert(plaidConnection)
    .values({
      institutionId: "ins_test",
      plaidAccessToken: `seed-token-${SOURCE_TAG}`,
      plaidItemId: `seed-item-${SOURCE_TAG}`,
      userId: TEST_USER_ID,
    })
    .returning({ id: plaidConnection.id });
  if (!conn) {
    throw new Error("plaidConnection seed failed");
  }
  const [acct] = await db
    .insert(financialAccount)
    .values({
      externalId: `seed-acct-${SOURCE_TAG}`,
      name: "Test Checking",
      plaidConnectionId: conn.id,
      source: "plaid",
      subtype: "checking",
      type: "depository",
      userId: TEST_USER_ID,
    })
    .returning({ id: financialAccount.id });
  if (!acct) {
    throw new Error("financialAccount seed failed");
  }
  TEST_ACCOUNT_ID = acct.id;
}

async function cleanupFixtures(): Promise<void> {
  await db.execute(sql`
    DELETE FROM enrichment.enrichment_event
    WHERE transaction_id IN (SELECT id FROM public.transaction WHERE user_id = ${TEST_USER_ID})
  `);
  await db.execute(sql`DELETE FROM public.transaction WHERE user_id = ${TEST_USER_ID}`);
  // Broad pattern intentionally catches leaked fixtures from prior aborted runs.
  await db.execute(sql`DELETE FROM enrichment.place WHERE source LIKE 'test-enrich-%'`);
}

describe("places enrichment — DB-level integration", () => {
  beforeAll(async () => {
    await ensureUser();
    await ensureAccount();
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  afterAll(async () => {
    await cleanupFixtures();
    await db.delete(financialAccount).where(eq(financialAccount.userId, TEST_USER_ID));
    await db.delete(plaidConnection).where(eq(plaidConnection.userId, TEST_USER_ID));
  });

  // ─── Branch routing: store_number ────────────────────────────────────────

  describe("findPlaceForTransaction — store_number branch", () => {
    it("matches by exact store_number when name + store_number + region align", async () => {
      const placeId = await seedPlace({
        address: "123 Main St",
        brandName: "Ztest Caffeen",
        city: "Manhattan",
        region: "NY",
        sourceId: "sb-store-1",
        storeNumber: "4823",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: null,
        lat: null,
        lon: null,
        name: "Ztest Caffeen",
        postalCode: null,
        region: "NY",
        storeNumber: "4823",
      });
      expect(res?.place.id).toBe(placeId);
      expect(res?.reason).toBe("store_number");
      expect(res?.confidence).toBeGreaterThanOrEqual(0.65);
    });

    it("rejects when store_number matches but brand name diverges past threshold", async () => {
      await seedPlace({
        address: "1 Way",
        brandName: "Ztest Caffeen",
        city: "Manhattan",
        region: "NY",
        sourceId: "sb-store-2",
        storeNumber: "7777",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: null,
        lat: null,
        lon: null,
        name: "Ztest Joeespza",
        postalCode: null,
        region: null,
        storeNumber: "7777",
      });
      expect(res).toBeNull();
    });
  });

  // ─── Branch routing: geo ─────────────────────────────────────────────────

  describe("findPlaceForTransaction — geo branch", () => {
    it("matches by lat/lon within radius when name aligns", async () => {
      const placeId = await seedPlace({
        address: "350 5th Ave",
        brandName: "Ztest Empyrestate",
        city: "Manhattan",
        lat: 40.7484,
        lon: -73.9857,
        region: "NY",
        sourceId: "esc-1",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: null,
        lat: 40.7484,
        lon: -73.9857,
        name: "Ztest Empyrestate",
        postalCode: null,
        region: null,
        storeNumber: null,
      });
      expect(res?.place.id).toBe(placeId);
      expect(res?.reason).toBe("geo");
    });

    it("does not match far-away coordinates even with same brand name", async () => {
      await seedPlace({
        address: "1 Pine",
        brandName: "Ztest Farplace",
        city: "Seattle",
        lat: 47.6062,
        lon: -122.3321,
        region: "WA",
        sourceId: "fc-1",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: null,
        lat: 40.7484,
        lon: -73.9857, // NYC, not Seattle
        name: "Ztest Farplace",
        postalCode: null,
        region: null,
        storeNumber: null,
      });
      expect(res).toBeNull();
    });
  });

  // ─── Branch routing: postal ──────────────────────────────────────────────

  describe("findPlaceForTransaction — postal branch", () => {
    it("matches by ZIP + name when no lat/lon or store_number", async () => {
      const placeId = await seedPlace({
        address: "100 Greenpoint Ave",
        brandName: "Ztest Bgls",
        city: "Brooklyn",
        postalCode: "11222",
        region: "NY",
        sourceId: "bb-1",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: null,
        lat: null,
        lon: null,
        name: "Ztest Bgls",
        postalCode: "11222",
        region: "NY",
        storeNumber: null,
      });
      expect(res?.place.id).toBe(placeId);
      expect(res?.reason).toBe("postal");
    });
  });

  // ─── Branch routing: locality_zip (NYC borough fallback) ─────────────────

  describe("findPlaceForTransaction — locality_zip branch", () => {
    it("matches via borough-expanded ZIPs when only city+region given", async () => {
      const placeId = await seedPlace({
        address: "72-31 37th Ave",
        brandName: "Ztest Rajaswtfastfd",
        city: "Queens",
        postalCode: "11372",
        region: "NY",
        sourceId: "raja-queens-1",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: "Jackson Heights", // → Queens NTA
        lat: null,
        lon: null,
        name: "Ztest Rajaswtfastfd",
        postalCode: null,
        region: "NY",
        storeNumber: null,
      });
      expect(res?.place.id).toBe(placeId);
      expect(res?.reason).toBe("locality_zip");
      expect(res?.sim).toBeGreaterThanOrEqual(0.7); // floor enforced
    });

    it("rejects weak name match below 0.7 sim floor for locality_zip", async () => {
      // Both query + seeded place use synthetic Ztest_ brand names so real
      // Overture rows on local DB can't interfere. Compact sim
      // ("ztestbarrr" vs "ztestcafe") is ~0.5 — below the 0.7 city/locality_zip
      // floor, so the matcher must reject.
      await seedPlace({
        address: "100 Bedford Ave",
        brandName: "Ztest Cafe",
        city: "Brooklyn",
        postalCode: "11211",
        region: "NY",
        sourceId: "weak-name-1",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: "Williamsburg",
        lat: null,
        lon: null,
        name: "Ztest Barrr",
        postalCode: null,
        region: "NY",
        storeNumber: null,
      });
      expect(res).toBeNull();
    });
  });

  // ─── Branch routing: city_region (worst-anchor last resort) ──────────────

  describe("findPlaceForTransaction — city_region branch", () => {
    it("matches when name + city + non-NY region given", async () => {
      const placeId = await seedPlace({
        address: "1 Tryon Rd",
        brandName: "Ztest Chrlcoffee",
        city: "Charlotte",
        region: "NC",
        sourceId: "ccr-1",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: "Charlotte",
        lat: null,
        lon: null,
        name: "Ztest Chrlcoffee",
        postalCode: null,
        region: "NC",
        storeNumber: null,
      });
      expect(res?.place.id).toBe(placeId);
      expect(res?.reason).toBe("city_region");
    });

    // Regression: the "Ztest Rajaswt" → Manhattan "Sweet" false positive that
    // motivated dropping `word_similarity()` from `simExpr` + raising the
    // `city_region` sim floor to 0.7.
    it("rejects single-shared-token false positive (Raja's regression)", async () => {
      await seedPlace({
        address: "270 Greenwich St",
        brandName: "Swt",
        city: "Manhattan",
        postalCode: "10007",
        region: "NY",
        sourceId: "sweet-manhattan-1",
      });
      const res = await findPlaceForTransaction({
        address: null,
        city: "Jackson Heights",
        lat: null,
        lon: null,
        name: "Ztest Rajaswt",
        postalCode: null,
        region: "NY",
        storeNumber: null,
      });
      expect(res).toBeNull();
    });
  });

  // ─── Pipeline: enrichTransactionsForUser writes + audit ──────────────────

  describe("enrichTransactionsForUser — write policy + audit", () => {
    it("writes place_id + confidence + missing brand fields on a clean match", async () => {
      await seedPlace({
        address: "350 5th Ave",
        brandDomain: "starbucks.com",
        brandName: "Ztest Caffeen",
        city: "Manhattan",
        lat: 40.7484,
        lon: -73.9857,
        postalCode: "10118",
        region: "NY",
        sourceId: "sb-clean-1",
      });
      const txnId = await seedTxn({
        lat: 40.7484,
        lon: -73.9857,
        merchantName: "Ztest Caffeen",
        name: "STARBUCKS",
      });
      const res = await enrichTransactionsForUser(TEST_USER_ID);
      expect(res.enriched).toBe(1);

      const row = await getTxn(txnId);
      expect(row?.place_id).toBeTruthy();
      expect(Number(row?.place_match_confidence)).toBeGreaterThanOrEqual(0.65);
      expect(row?.website).toBe("starbucks.com");
    });

    it("does NOT overwrite Plaid-non-null location fields", async () => {
      await seedPlace({
        address: "350 5th Ave",
        brandName: "Ztest Caffeen",
        city: "Manhattan",
        lat: 40.7484,
        lon: -73.9857,
        postalCode: "10118",
        region: "NY",
        sourceId: "sb-policy-1",
      });
      const txnId = await seedTxn({
        address: "USER-EDITED ADDR",
        city: "Brooklyn",
        lat: 40.7484,
        lon: -73.9857,
        merchantName: "Ztest Caffeen",
        name: "Ztest Caffeen",
        region: "NY",
      });
      await enrichTransactionsForUser(TEST_USER_ID);
      const row = await getTxn(txnId);
      expect(row?.address).toBe("USER-EDITED ADDR");
      expect(row?.city).toBe("Brooklyn");
      expect(row?.place_id).toBeTruthy();
    });

    it("respects lockedFields — blocks writes on locked column", async () => {
      await seedPlace({
        address: "350 5th Ave",
        brandDomain: "ztestcaffeen.example",
        brandName: "Ztest Caffeen",
        city: "Manhattan",
        lat: 40.7484,
        lon: -73.9857,
        region: "NY",
        sourceId: "sb-locked-1",
      });
      // merchantName must match seeded brand so the matcher hits geo. We lock
      // `website` (which Plaid sent null for; matcher would fill it) and confirm
      // it stays null even though place.brand_domain is set.
      const txnId = await seedTxn({
        lat: 40.7484,
        lockedFields: ["website"],
        lon: -73.9857,
        merchantName: "Ztest Caffeen",
        name: "Ztest Caffeen",
      });
      await enrichTransactionsForUser(TEST_USER_ID);
      const row = await getTxn(txnId);
      expect(row?.place_id).toBeTruthy();
      expect(row?.website).toBeNull(); // locked → not overwritten
    });

    it("skips txns below CONFIDENCE_FLOOR (0.65)", async () => {
      await seedPlace({
        address: "1 Way",
        brandName: "Ztest Acmbglz",
        city: "Manhattan",
        region: "NY",
        sourceId: "acme-1",
      });
      const txnId = await seedTxn({
        city: "Manhattan",
        name: "Totally Different Brand",
        region: "NY",
      });
      await enrichTransactionsForUser(TEST_USER_ID);
      const row = await getTxn(txnId);
      expect(row?.place_id).toBeNull();
    });

    it("writes one enrichment_event per matched txn, paired by runId", async () => {
      await seedPlace({
        address: "350 5th Ave",
        brandName: "Ztest Caffeen",
        city: "Manhattan",
        lat: 40.7484,
        lon: -73.9857,
        region: "NY",
        sourceId: "sb-audit-1",
      });
      await seedTxn({
        lat: 40.7484,
        lon: -73.9857,
        name: "Ztest Caffeen",
      });
      const res = await enrichTransactionsForUser(TEST_USER_ID);
      const events = await getEnrichmentEvents(res.runId);
      expect(events).toHaveLength(1);
      expect(events[0]?.match_reason).toBe("geo");
      expect(events[0]?.place_id).toBeTruthy();
      expect(Number(events[0]?.match_confidence)).toBeGreaterThanOrEqual(0.65);
    });

    it("is idempotent — second run writes no additional events or place_ids", async () => {
      await seedPlace({
        address: "350 5th Ave",
        brandName: "Ztest Caffeen",
        city: "Manhattan",
        lat: 40.7484,
        lon: -73.9857,
        region: "NY",
        sourceId: "sb-idem-1",
      });
      await seedTxn({
        lat: 40.7484,
        lon: -73.9857,
        name: "Ztest Caffeen",
      });
      const first = await enrichTransactionsForUser(TEST_USER_ID);
      const second = await enrichTransactionsForUser(TEST_USER_ID);
      expect(first.enriched).toBe(1);
      expect(second.enriched).toBe(0);
    });

    it("ignores online-channel txns (in-store only)", async () => {
      await seedPlace({
        address: "350 5th Ave",
        brandName: "Ztest Caffeen",
        city: "Manhattan",
        region: "NY",
        sourceId: "sb-online-1",
      });
      const txnId = await seedTxn({
        lat: 40.7484,
        lon: -73.9857,
        name: "Ztest Caffeen",
        paymentChannel: "online",
      });
      await enrichTransactionsForUser(TEST_USER_ID);
      const row = await getTxn(txnId);
      expect(row?.place_id).toBeNull();
    });

    it("ignores non-FOOD_AND_DRINK pfc_primary", async () => {
      await seedPlace({
        address: "350 5th Ave",
        brandName: "Ztest BstBy",
        city: "Manhattan",
        region: "NY",
        sourceId: "bb-merch-1",
      });
      const txnId = await seedTxn({
        lat: 40.7484,
        lon: -73.9857,
        name: "Ztest BstBy",
        pfcPrimary: "GENERAL_MERCHANDISE",
      });
      await enrichTransactionsForUser(TEST_USER_ID);
      const row = await getTxn(txnId);
      expect(row?.place_id).toBeNull();
    });
  });
});
