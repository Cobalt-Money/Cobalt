/**
 * SRI-354 — ZIP → USPS city normalizer + locality recovery helpers.
 *
 * Solves three Plaid quirks the matcher hits constantly:
 *   1. Plaid sends `city = "New York"` for NYC chains regardless of which
 *      borough the swipe happened in. The directory stores the borough
 *      literal ("Manhattan", "Brooklyn", …), so the raw value never matches.
 *   2. Some ZIP ranges in NY (e.g. 11357) are USPS-named "Whitestone" but
 *      Overture stores "Queens" — using ZIP→borough collapses both onto the
 *      directory's canonical city.
 *   3. Plaid often returns NYC NEIGHBORHOOD names ("Woodside", "Astoria",
 *      "Williamsburg") instead of the borough. The matcher needs the borough
 *      literal to hit indexed candidates — we keep a hand-coded map of the
 *      ~80 most common ones below.
 *
 * Lookup priority: ZIP first (precise), then city literal (with NYC fan-out).
 */
import { db } from "@cobalt-web/db";
import { localityZip } from "@cobalt-web/db/schema/places/locality-zip";
import { and, eq, sql } from "drizzle-orm";

type NumericRange = readonly [number, number];

/** NYC ZIP ranges → borough literal. Source: USPS Publication 65. */
const NYC_BOROUGH_RANGES: readonly {
  borough: string;
  ranges: readonly NumericRange[];
}[] = [
  { borough: "Manhattan", ranges: [[10_001, 10_282]] },
  { borough: "Bronx", ranges: [[10_451, 10_475]] },
  { borough: "Staten Island", ranges: [[10_301, 10_314]] },
  {
    borough: "Queens",
    ranges: [
      [11_004, 11_109],
      [11_351, 11_697],
    ],
  },
  { borough: "Brooklyn", ranges: [[11_201, 11_256]] },
];

const NYC_BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const;

/**
 * NYC neighborhood → borough literal. Seeded from NYC Department of City
 * Planning's 2020 Neighborhood Tabulation Areas (NTAs) — the official 188
 * residential NTAs (NTAType=0), filtered down from the 262-row dataset to
 * skip parks, cemeteries, airports, and Rikers. Augmented with ~40 vernacular
 * aliases Plaid commonly emits that aren't official NTA names (NoMad, FiDi,
 * LIC, SoHo, etc.). Lowercased keys; lookups lowercase the input.
 *
 * Source: https://data.cityofnewyork.us/City-Government/2020-Neighborhood-Tabulation-Areas-NTAs/9nt8-h7nd
 *
 * Add new aliases as Plaid surfaces them — check prod via
 *   SELECT lower(city), COUNT(*) FROM transaction
 *   WHERE region IN ('NY','New York') AND postal_code IS NULL
 *     AND lower(city) NOT IN (... known boroughs/aliases ...)
 *   GROUP BY 1 ORDER BY 2 DESC;
 */
const NYC_NEIGHBORHOOD_TO_BOROUGH: Record<string, string> = {
  allerton: "Bronx",
  "annadale-huguenot-prince's bay-woodrow": "Staten Island",
  "arden heights-rossville": "Staten Island",
  astoria: "Queens",
  "astoria-ditmars-steinway": "Queens",
  "astoria-woodside": "Queens",
  auburndale: "Queens",
  "baisley park": "Queens",
  "bath beach": "Brooklyn",
  "battery park": "Manhattan",
  "battery park city": "Manhattan",
  "bay ridge": "Brooklyn",
  "bay terrace-clearview": "Queens",
  bayside: "Queens",
  "bed stuy": "Brooklyn",
  "bedford park": "Bronx",
  "bedford stuyvesant": "Brooklyn",
  "bedford-stuyvesant": "Brooklyn",
  bellerose: "Queens",
  belmont: "Bronx",
  bensonhurst: "Brooklyn",
  "boerum hill": "Brooklyn",
  "borough park": "Brooklyn",
  "breezy point-belle harbor-rockaway park-broad channel": "Queens",
  "brighton beach": "Brooklyn",
  "brooklyn heights": "Brooklyn",
  brownsville: "Brooklyn",
  bushwick: "Brooklyn",
  "cambria heights": "Queens",
  canarsie: "Brooklyn",
  "carroll gardens": "Brooklyn",
  "carroll gardens-cobble hill-gowanus-red hook": "Brooklyn",
  "castle hill-unionport": "Bronx",
  chelsea: "Manhattan",
  "chelsea-hudson yards": "Manhattan",
  chinatown: "Manhattan",
  "chinatown-two bridges": "Manhattan",
  "claremont village-claremont": "Bronx",
  "clinton hill": "Brooklyn",
  "co-op city": "Bronx",
  "cobble hill": "Brooklyn",
  "college point": "Queens",
  concourse: "Bronx",
  "concourse-concourse village": "Bronx",
  "coney island-sea gate": "Brooklyn",
  corona: "Queens",
  "crotona park east": "Bronx",
  "crown heights": "Brooklyn",
  "cypress hills": "Brooklyn",
  "douglaston-little neck": "Queens",
  "downtown brooklyn-dumbo-boerum hill": "Brooklyn",
  dumbo: "Brooklyn",
  "dyker heights": "Brooklyn",
  "east elmhurst": "Queens",
  "east flatbush-erasmus": "Brooklyn",
  "east flatbush-farragut": "Brooklyn",
  "east flatbush-remsen village": "Brooklyn",
  "east flatbush-rugby": "Brooklyn",
  "east flushing": "Queens",
  "east harlem": "Manhattan",
  "east midtown-turtle bay": "Manhattan",
  "east new york": "Brooklyn",
  "east new york-city line": "Brooklyn",
  "east new york-new lots": "Brooklyn",
  "east village": "Manhattan",
  "east williamsburg": "Brooklyn",
  "eastchester-edenwald-baychester": "Bronx",
  elmhurst: "Queens",
  "far rockaway-bayswater": "Queens",
  fidi: "Manhattan",
  "financial district": "Manhattan",
  "financial district-battery park city": "Manhattan",
  flatbush: "Brooklyn",
  "flatbush-ditmas park-parkville": "Brooklyn",
  flatlands: "Brooklyn",
  flushing: "Queens",
  "flushing-willets point": "Queens",
  fordham: "Bronx",
  "fordham heights": "Bronx",
  "forest hills": "Queens",
  "fort greene": "Brooklyn",
  "fresh meadows-utopia": "Queens",
  "glen oaks-floral park-new hyde park": "Queens",
  glendale: "Queens",
  gowanus: "Brooklyn",
  gramercy: "Manhattan",
  "grasmere-arrochar-south beach-dongan hills": "Staten Island",
  gravesend: "Brooklyn",
  "gravesend-homecrest": "Brooklyn",
  "great kills-eltingville": "Staten Island",
  greenpoint: "Brooklyn",
  "greenwich village": "Manhattan",
  "hamilton heights-sugar hill": "Manhattan",
  harlem: "Manhattan",
  "hell's kitchen": "Manhattan",
  "hells kitchen": "Manhattan",
  highbridge: "Bronx",
  hollis: "Queens",
  "howard beach-lindenwood": "Queens",
  "hunts point": "Bronx",
  inwood: "Manhattan",
  "jackson heights": "Queens",
  jamaica: "Queens",
  "jamaica estates-holliswood": "Queens",
  "jamaica hills-briarwood": "Queens",
  kensington: "Brooklyn",
  "kew gardens": "Queens",
  "kew gardens hills": "Queens",
  "kingsbridge heights-van cortlandt village": "Bronx",
  "kingsbridge-marble hill": "Bronx",
  "kips bay": "Manhattan",
  laurelton: "Queens",
  les: "Manhattan",
  lic: "Queens",
  "long island city": "Queens",
  "long island city-hunters point": "Queens",
  longwood: "Bronx",
  "lower east side": "Manhattan",
  madison: "Brooklyn",
  "manhattanville-west harlem": "Manhattan",
  "mapleton-midwood": "Brooklyn",
  "marine park-mill basin-bergen beach": "Brooklyn",
  "mariner's harbor-arlington-graniteville": "Staten Island",
  maspeth: "Queens",
  melrose: "Bronx",
  "middle village": "Queens",
  midtown: "Manhattan",
  "midtown south-flatiron-union square": "Manhattan",
  "midtown-times square": "Manhattan",
  midwood: "Brooklyn",
  "morningside heights": "Manhattan",
  "morris park": "Bronx",
  morrisania: "Bronx",
  "mott haven": "Bronx",
  "mott haven-port morris": "Bronx",
  "mount eden-claremont": "Bronx",
  "mount hope": "Bronx",
  "murray hill": "Manhattan",
  "murray hill-broadway flushing": "Queens",
  "murray hill-kips bay": "Manhattan",
  "new dorp-midland beach": "Staten Island",
  "new springville-willowbrook-bulls head-travis": "Staten Island",
  noho: "Manhattan",
  nolita: "Manhattan",
  nomad: "Manhattan",
  "north corona": "Queens",
  norwood: "Bronx",
  "oakland gardens-hollis hills": "Queens",
  "oakwood-richmondtown": "Staten Island",
  "ocean hill": "Brooklyn",
  "old astoria-hallets point": "Queens",
  "ozone park": "Queens",
  "park slope": "Brooklyn",
  parkchester: "Bronx",
  "pelham bay-country club-city island": "Bronx",
  "pelham gardens": "Bronx",
  "pelham parkway-van nest": "Bronx",
  "pomonok-electchester-hillcrest": "Queens",
  "port richmond": "Staten Island",
  "prospect heights": "Brooklyn",
  "prospect lefferts gardens-wingate": "Brooklyn",
  "queens village": "Queens",
  "queensboro hill": "Queens",
  "queensbridge-ravenswood-dutch kills": "Queens",
  "red hook": "Brooklyn",
  "rego park": "Queens",
  "richmond hill": "Queens",
  ridgewood: "Queens",
  riverdale: "Bronx",
  "riverdale-spuyten duyvil": "Bronx",
  "rockaway beach-arverne-edgemere": "Queens",
  "rosebank-shore acres-park hill": "Staten Island",
  rosedale: "Queens",
  "saint george": "Staten Island",
  "sheepshead bay-manhattan beach-gerritsen beach": "Brooklyn",
  soho: "Manhattan",
  "soho-little italy-hudson square": "Manhattan",
  "soundview-bruckner-bronx river": "Bronx",
  "soundview-clason point": "Bronx",
  "south jamaica": "Queens",
  "south ozone park": "Queens",
  "south richmond hill": "Queens",
  "south williamsburg": "Brooklyn",
  "spring creek-starrett city": "Brooklyn",
  "springfield gardens-brookville": "Queens",
  "springfield gardens-rochdale village": "Queens",
  "st george": "Staten Island",
  "st. albans": "Queens",
  "st. george-new brighton": "Staten Island",
  "stuyvesant town-peter cooper village": "Manhattan",
  sunnyside: "Queens",
  "sunset park": "Brooklyn",
  "sunset park-borough park": "Brooklyn",
  "throgs neck": "Bronx",
  "throgs neck-schuylerville": "Bronx",
  "todt hill-emerson hill-lighthouse hill-manor heights": "Staten Island",
  "tompkinsville-stapleton-clifton-fox hills": "Staten Island",
  tottenville: "Staten Island",
  "tottenville-charleston": "Staten Island",
  tremont: "Bronx",
  tribeca: "Manhattan",
  "tribeca-civic center": "Manhattan",
  ues: "Manhattan",
  "university heights-fordham": "Bronx",
  "university heights-morris heights": "Bronx",
  "upper east side": "Manhattan",
  "upper east side-carnegie hill": "Manhattan",
  "upper east side-lenox hill-roosevelt island": "Manhattan",
  "upper east side-yorkville": "Manhattan",
  "upper west side": "Manhattan",
  "upper west side-lincoln square": "Manhattan",
  "upper west side-manhattan valley": "Manhattan",
  uws: "Manhattan",
  "wakefield-woodlawn": "Bronx",
  "washington heights": "Manhattan",
  "west farms": "Bronx",
  "west new brighton-silver lake-grymes hill": "Staten Island",
  "west village": "Manhattan",
  "westchester square": "Bronx",
  "westerleigh-castleton corners": "Staten Island",
  "whitestone-beechhurst": "Queens",
  "williamsbridge-olinville": "Bronx",
  williamsburg: "Brooklyn",
  "windsor terrace": "Brooklyn",
  "windsor terrace-south slope": "Brooklyn",
  woodhaven: "Queens",
  woodside: "Queens",
};

/**
 * Resolve a ZIP+region to a canonical city literal. Returns null when the ZIP
 * is unknown or the region is outside the special-case set.
 */
export function zipToCity(postalCode: string | null, region: string | null): string | null {
  if (!postalCode || !region) {
    return null;
  }
  const zip = Number.parseInt(postalCode.slice(0, 5), 10);
  if (!Number.isFinite(zip)) {
    return null;
  }
  if (region === "NY") {
    for (const { borough, ranges } of NYC_BOROUGH_RANGES) {
      if (ranges.some(([lo, hi]) => zip >= lo && zip <= hi)) {
        return borough;
      }
    }
  }
  return null;
}

/**
 * Candidate cities to try when filtering the directory. Used by the matcher
 * when Plaid's city literal is ambiguous (e.g. "New York" for any NYC chain).
 */
export function expandCityCandidates(
  city: string | null,
  region: string | null,
  postalCode: string | null,
): string[] {
  const zipCity = zipToCity(postalCode, region);
  if (zipCity) {
    return [zipCity];
  }
  if (region === "NY" && city) {
    const lower = city.toLowerCase();
    // "new york" / "nyc" / Plaid's truncated "york" → Manhattan specifically.
    // In Plaid's data, other boroughs come through with their actual borough
    // literal ("Brooklyn", "Queens") so the "New York" literal almost always
    // refers to Manhattan.
    if (lower === "new york" || lower === "nyc" || lower === "york") {
      return ["Manhattan"];
    }
    // Neighborhood (Woodside / Astoria / Williamsburg) → its borough.
    const borough = NYC_NEIGHBORHOOD_TO_BOROUGH[lower];
    if (borough) {
      return [borough];
    }
    const isBorough = NYC_BOROUGHS.some((b) => b.toLowerCase() === lower);
    // Other non-borough, non-neighborhood NY cities → collapse to full
    // 5-borough candidate set; trgm + brand match disambiguates from there.
    if (!isBorough) {
      return [...NYC_BOROUGHS];
    }
  }
  return city ? [city] : [];
}

/**
 * Look up the set of ZIPs (zip5s) for a (city, state) tuple from the
 * locality_zip reference table. Returns at most `limit` results, ordered by
 * proximity to the table's primary key — used by the enrichment matcher to
 * recover a missing `postal_code` from Plaid txns that only carry `city +
 * region`. Caller is responsible for caching across a batch if doing many
 * lookups; one query is ~1ms via the (state, city) index.
 *
 * Returns empty array if no match — caller decides whether to fall through
 * to the weaker city_region branch.
 */
export async function resolveLocalityZips(
  city: string | null,
  region: string | null,
  limit = 100,
): Promise<string[]> {
  if (!city || !region || region.length !== 2) {
    return [];
  }
  const rows = await db
    .select({ zip5: localityZip.zip5 })
    .from(localityZip)
    .where(
      and(
        eq(localityZip.state, region.toUpperCase()),
        sql`lower(${localityZip.city}) = ${city.toLowerCase()}`,
      ),
    )
    .limit(limit);
  return rows.map((r) => r.zip5);
}
