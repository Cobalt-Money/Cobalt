import { describe, expect, it, vi } from "vitest";

import { expandCityCandidates, zipToCity } from "./zip-city.js";

// resolveLocalityZips hits the DB; mock it out for the pure-function tests
// below. expandCityCandidates / zipToCity are synchronous and DB-free.
vi.mock(
  import("@cobalt-web/db"),
  () =>
    ({
      db: {
        select: vi.fn(),
      },
    }) as never,
);

vi.mock(
  import("@cobalt-web/db/schema/places/locality-zip"),
  () =>
    ({
      localityZip: {},
    }) as never,
);

describe("zipToCity", () => {
  it("returns null when ZIP or region missing", () => {
    expect(zipToCity(null, "NY")).toBeNull();
    expect(zipToCity("10001", null)).toBeNull();
    expect(zipToCity(null, null)).toBeNull();
  });

  it("returns null for non-NY regions (no other special cases yet)", () => {
    expect(zipToCity("90001", "CA")).toBeNull();
    expect(zipToCity("60601", "IL")).toBeNull();
  });

  it("returns null for malformed ZIPs", () => {
    expect(zipToCity("abc", "NY")).toBeNull();
    expect(zipToCity("", "NY")).toBeNull();
  });

  it("maps NY ZIPs onto NYC borough literals", () => {
    expect(zipToCity("10001", "NY")).toBe("Manhattan"); // Midtown
    expect(zipToCity("10025", "NY")).toBe("Manhattan"); // UWS
    expect(zipToCity("10282", "NY")).toBe("Manhattan"); // Battery Park edge
    expect(zipToCity("10451", "NY")).toBe("Bronx");
    expect(zipToCity("10301", "NY")).toBe("Staten Island");
    expect(zipToCity("11201", "NY")).toBe("Brooklyn");
    expect(zipToCity("11377", "NY")).toBe("Queens"); // Woodside
    expect(zipToCity("11697", "NY")).toBe("Queens"); // Far Rockaway edge
  });

  it("handles ZIP+4 by taking the first 5 digits", () => {
    expect(zipToCity("10001-1234", "NY")).toBe("Manhattan");
  });

  it("returns null for NY ZIPs outside the NYC ranges (upstate)", () => {
    expect(zipToCity("12345", "NY")).toBeNull(); // Schenectady
    expect(zipToCity("13502", "NY")).toBeNull(); // Utica
  });
});

describe("expandCityCandidates", () => {
  it("prefers ZIP→city when both available", () => {
    expect(expandCityCandidates("Brooklyn", "NY", "10001")).toStrictEqual(["Manhattan"]);
  });

  it('maps Plaid\'s "New York" / "york" / "nyc" to Manhattan only', () => {
    expect(expandCityCandidates("New York", "NY", null)).toStrictEqual(["Manhattan"]);
    expect(expandCityCandidates("york", "NY", null)).toStrictEqual(["Manhattan"]);
    expect(expandCityCandidates("NYC", "NY", null)).toStrictEqual(["Manhattan"]);
  });

  it("maps NYC neighborhoods to their borough", () => {
    expect(expandCityCandidates("Woodside", "NY", null)).toStrictEqual(["Queens"]);
    expect(expandCityCandidates("Astoria", "NY", null)).toStrictEqual(["Queens"]);
    expect(expandCityCandidates("Williamsburg", "NY", null)).toStrictEqual(["Brooklyn"]);
    expect(expandCityCandidates("Bushwick", "NY", null)).toStrictEqual(["Brooklyn"]);
    expect(expandCityCandidates("SoHo", "NY", null)).toStrictEqual(["Manhattan"]);
    expect(expandCityCandidates("Tribeca", "NY", null)).toStrictEqual(["Manhattan"]);
    expect(expandCityCandidates("Mott Haven", "NY", null)).toStrictEqual(["Bronx"]);
  });

  it("passes through NYC borough literals unchanged", () => {
    expect(expandCityCandidates("Brooklyn", "NY", null)).toStrictEqual(["Brooklyn"]);
    expect(expandCityCandidates("Queens", "NY", null)).toStrictEqual(["Queens"]);
  });

  it("falls back to all 5 boroughs for unknown NY cities", () => {
    const result = expandCityCandidates("UnknownNeighborhood", "NY", null);
    expect(result).toHaveLength(5);
    expect(result).toStrictEqual(
      expect.arrayContaining(["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]),
    );
  });

  it("returns the literal city for non-NY regions", () => {
    expect(expandCityCandidates("Charlotte", "NC", null)).toStrictEqual(["Charlotte"]);
    expect(expandCityCandidates("San Francisco", "CA", null)).toStrictEqual(["San Francisco"]);
  });

  it("returns empty array when city missing and no ZIP", () => {
    expect(expandCityCandidates(null, "NC", null)).toStrictEqual([]);
    expect(expandCityCandidates(null, null, null)).toStrictEqual([]);
  });

  it("is case-insensitive on neighborhood lookups", () => {
    expect(expandCityCandidates("WOODSIDE", "NY", null)).toStrictEqual(["Queens"]);
    expect(expandCityCandidates("woodside", "NY", null)).toStrictEqual(["Queens"]);
    expect(expandCityCandidates("WoodSide", "NY", null)).toStrictEqual(["Queens"]);
  });
});
