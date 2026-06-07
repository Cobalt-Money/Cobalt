/**
 * Integration test against local Postgres seeded with the SRI-352 directory.
 * Skipped automatically when LOCAL_DATABASE_URL isn't pointed at a populated DB
 * (CI doesn't have the merchant tables seeded).
 */
import { beforeAll, describe, expect, it } from "vitest";

const RUN = Boolean(process.env.MERCHANT_FIND_INTEGRATION);

describe.runIf(RUN)("findMerchantForTransaction (integration)", () => {
  const ctx = { commonRegion: "NY", userId: "test-user" };
  // Lazy import so non-integration runs don't crash on @cobalt-web/db env validation.
  let findMerchantForTransaction: (typeof import("./find"))["findMerchantForTransaction"];
  beforeAll(async () => {
    ({ findMerchantForTransaction } = await import("./find"));
  });

  it("matches a chain by trgm + falls to brand-only when in-store + no precise signal", async () => {
    const res = await findMerchantForTransaction(
      {
        city: "New York",
        name: "STARBUCKS #4823 NEW YORK NY",
        paymentChannel: "in store",
        region: "NY",
      },
      ctx,
    );
    expect(res).not.toBeNull();
    expect(res!.merchant.canonicalName).toBe("Starbucks");
    expect(res!.merchant.domain).toBe("starbucks.com");
    expect(res!.location).toBeNull();
    expect(res!.confidence).toBe("high");
    expect(res!.reason).toBe("chain_brand_only");
  });

  it("returns brand-only for online txns regardless of brand size", async () => {
    const res = await findMerchantForTransaction(
      { name: "MCDONALD'S", paymentChannel: "online" },
      ctx,
    );
    expect(res!.location).toBeNull();
    expect(res!.reason).toBe("brand_only");
  });

  it("pins a singleton merchant when Plaid gave a location signal", async () => {
    const res = await findMerchantForTransaction(
      { name: "Russ & Daughters", paymentChannel: "in store", region: "NY" },
      ctx,
    );
    expect(res!.merchant.domain).toBe("russanddaughters.com");
    expect(res!.location).not.toBeNull();
    expect(res!.reason).toBe("singleton");
  });

  it("returns brand-only for singleton when Plaid gave NO location signal", async () => {
    const res = await findMerchantForTransaction(
      { name: "Russ & Daughters", paymentChannel: "in store" },
      ctx,
    );
    expect(res!.merchant.domain).toBe("russanddaughters.com");
    expect(res!.location).toBeNull();
    expect(res!.reason).toBe("brand_only");
  });

  it("returns null for merchants not in the directory", async () => {
    const res = await findMerchantForTransaction(
      { name: "TOTALLYFAKEMERCHANT", paymentChannel: "in store" },
      ctx,
    );
    expect(res).toBeNull();
  });

  it("maps Plaid city='New York' to borough names (Manhattan first, Brooklyn fallback)", async () => {
    // City expansion: tries Manhattan first; if 0 hits, falls through Brooklyn/Queens/etc.
    // Russ & Daughters has a Manhattan location, so Plaid "New York" should land Manhattan.
    const res = await findMerchantForTransaction(
      { city: "New York", name: "Russ & Daughters", paymentChannel: "in store", region: "NY" },
      ctx,
    );
    expect(res?.merchant.canonicalName).toMatch(/Russ/);
    expect(res?.location?.region).toBe("NY");
    // either Manhattan match (high) or singleton if only 1 row
    expect(["high", "low"]).toContain(res?.confidence);
  });
});
