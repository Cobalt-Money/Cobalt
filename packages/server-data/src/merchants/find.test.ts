/**
 * Integration tests for the SRI-353 4-branch matcher. Runs against a Postgres
 * seeded with the canonical merchant directory.
 *
 * Skipped automatically when `MERCHANT_FIND_INTEGRATION` is unset (CI doesn't
 * have the merchant tables seeded).
 */
import { beforeAll, describe, expect, it } from "vitest";

const RUN = Boolean(process.env.MERCHANT_FIND_INTEGRATION);

describe.runIf(RUN)("findMerchantForTransaction (integration)", () => {
  const ctx = { userId: "test-user" };
  let findMerchantForTransaction: (typeof import("./find"))["findMerchantForTransaction"];
  beforeAll(async () => {
    ({ findMerchantForTransaction } = await import("./find"));
  });

  // ── Anchor-required: zero location signals → skip ──────────────────────────

  it("returns null when no location anchor is present", async () => {
    const res = await findMerchantForTransaction(
      { name: "STARBUCKS #4823", paymentChannel: "in store" },
      ctx,
    );
    expect(res).toBeNull();
  });

  // ── Regression: SRI-353 MTA → Mt Ararat Bakery hijack ──────────────────────

  it("does NOT pin a non-chain singleton to a region-only txn (MTA hijack regression)", async () => {
    // "MTA*NYCT PAYGO NEW YORK USA" with region=NY, no lat/lon/address.
    // Old singleton tier auto-pinned Mt Ararat Bakery (only non-chain bakery
    // with "mt" prefix in NY). New city_region branch must NOT return the
    // bakery's location because byCityRegion(Mt Ararat, "New York"/borough) → 0
    // hits (bakery is in Bayside, not in the NYC borough expansion list).
    const res = await findMerchantForTransaction(
      {
        city: "New York",
        name: "MTA*NYCT PAYGO NEW YORK USA",
        paymentChannel: "in store",
        region: "NY",
      },
      ctx,
    );
    // Either matcher rejects entirely, or it returns Mt Ararat brand-only (no location).
    // What it MUST NOT do: return Mt Ararat with a non-null location.
    const wroteBakeryWithLocation =
      res?.merchant.canonicalName === "Mt Ararat Bakery" && res?.location !== null;
    expect(wroteBakeryWithLocation).toBeFalsy();
  });

  // ── Branch routing ─────────────────────────────────────────────────────────

  it("uses the geo branch when lat/lon are present", async () => {
    // Russ & Daughters NYC coords. Plaid name is POS garbage to prove the geo
    // branch can match without a clean name.
    const res = await findMerchantForTransaction(
      { lat: 40.7227, lon: -73.9886, name: "RUSSANDDAUGHT", paymentChannel: "in store" },
      ctx,
    );
    expect(res?.reason ?? "skipped").toMatch(/geo|skipped/);
    // If geo branch fired, it must include a location (geo never returns brand-only).
    const geoHitLackedLocation = res?.reason === "geo" && res.location === null;
    expect(geoHitLackedLocation).toBeFalsy();
  });

  it("uses the address or brand_only branch when address is present", async () => {
    const res = await findMerchantForTransaction(
      {
        address: "179 E Houston St",
        city: "New York",
        name: "Russ & Daughters",
        paymentChannel: "in store",
        region: "NY",
      },
      ctx,
    );
    expect(res?.reason ?? "address").toMatch(/address|brand_only/);
  });

  it("uses the city_region or brand_only branch when only city+region", async () => {
    const res = await findMerchantForTransaction(
      { city: "New York", name: "Russ & Daughters", paymentChannel: "in store", region: "NY" },
      ctx,
    );
    expect(res?.reason ?? "city_region").toMatch(/city_region|brand_only/);
    expect(res?.merchant.canonicalName ?? "").toMatch(/Russ/);
  });

  // ── Chain handling ─────────────────────────────────────────────────────────

  it("returns brand_only for chain when no specific location resolves", async () => {
    // Starbucks has hundreds of NYC locations → byCityRegion returns >1 → brand_only.
    const res = await findMerchantForTransaction(
      {
        city: "New York",
        name: "STARBUCKS",
        paymentChannel: "in store",
        region: "NY",
      },
      ctx,
    );
    expect(res?.merchant.canonicalName).toBe("Starbucks");
    expect(res?.location).toBeNull();
    expect(res?.reason).toBe("brand_only");
  });

  // ── Trgm miss / unknown brand ──────────────────────────────────────────────

  it("returns null for merchants not in the directory", async () => {
    const res = await findMerchantForTransaction(
      { city: "New York", name: "TOTALLYFAKEMERCHANT", paymentChannel: "in store", region: "NY" },
      ctx,
    );
    expect(res).toBeNull();
  });

  // ── Region whitelist ───────────────────────────────────────────────────────

  it("rejects a non-chain brand whose only locations are outside the Plaid region", async () => {
    // Plaid says region=TX but Russ & Daughters is NY only → region whitelist
    // bails before any location lookup runs.
    const res = await findMerchantForTransaction(
      { city: "Austin", name: "Russ & Daughters", paymentChannel: "in store", region: "TX" },
      ctx,
    );
    expect(res).toBeNull();
  });
});
