# SRI-352 — Canonical Merchant Directory (places DB)

Self-contained spec. Clone into fresh worktree and run.
Parent: SRI-350 (enrichment pipeline) — consumes this directory.
Current SRI-350 worktree is **not touched** by any path below.

---

## 0. Worktree bootstrap

```bash
# from main Cobalt-Web checkout
git worktree add ../merchant-directory main
cd ../merchant-directory
bun install
bash sync-env.sh                 # pull .env from main worktree
git checkout -b sriketk5/sri-352-canonical-merchant-directory
```

New paths (zero overlap with SRI-350):

```
packages/db/src/schema/merchants/merchant.ts
packages/db/src/schema/merchants/merchant-location.ts
scripts/import/merchants/nyc-dohmh.ts
scripts/import/merchants/ny-retail-food.ts
scripts/import/merchants/la-county.ts
scripts/import/merchants/sf-dph.ts
scripts/import/merchants/osm-restaurants.ts
scripts/import/merchants/dedup-locations.ts
scripts/import/merchants/rollup-merchants.ts
scripts/import/merchants/domain-fill.ts
scripts/import/merchants/_lib/normalize.ts
```

Wire `merchants/*` into `packages/db/src/schema/schema.ts` only — no edits to existing schema files.

---

## 1. Seven-step run order

| #   | Step                                | Cmd                                                                                                                                 |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Extensions (one-time, PlanetScale)  | `psql "$MIGRATION_URI&sslrootcert=system" -f scripts/import/merchants/_sql/extensions.sql`                                          |
| 2   | Drizzle schema                      | edit files in `packages/db/src/schema/merchants/`                                                                                   |
| 3   | Generate + apply migration          | `bun drizzle-kit generate --config packages/db/drizzle.config.ts && bun drizzle-kit migrate --config packages/db/drizzle.config.ts` |
| 4   | Import (phase 1, idempotent)        | `bun run scripts/import/merchants/nyc-dohmh.ts` then `la-county.ts`, `sf-dph.ts`, `osm-restaurants.ts -- --state NY` etc.           |
| 5   | Dedup (phase 2)                     | `bun run scripts/import/merchants/dedup-locations.ts`                                                                               |
| 6   | Rollup (phase 3)                    | `bun run scripts/import/merchants/rollup-merchants.ts`                                                                              |
| 7   | Domain-fill (HEAD + OSM, zero paid) | `bun run scripts/import/merchants/domain-fill.ts`                                                                                   |

Verify:

```sql
SELECT COUNT(*) FROM merchant;
SELECT COUNT(*) FROM merchant_location;
SELECT canonical_name, location_count, domain
FROM merchant ORDER BY location_count DESC LIMIT 20;
```

---

## 2. Extensions

`scripts/import/merchants/_sql/extensions.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
```

Confirm:

```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_trgm','earthdistance','cube');
```

---

## 3. Schema

```sql
CREATE TABLE merchant (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name  text NOT NULL,
  name_normalized text NOT NULL,
  aliases         text[] NOT NULL DEFAULT '{}',
  domain          text,
  logo_url        text,
  category_system_key text NOT NULL,
  subtype         text,
  tags            text[] NOT NULL DEFAULT '{}',
  is_chain        boolean NOT NULL DEFAULT false,
  location_count  integer NOT NULL DEFAULT 0,
  domain_guess_attempts jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX merchant_name_trgm_idx    ON merchant USING gin (name_normalized gin_trgm_ops);
CREATE INDEX merchant_aliases_gin_idx  ON merchant USING gin (aliases);
CREATE INDEX merchant_category_idx     ON merchant (category_system_key);
CREATE INDEX merchant_tags_gin_idx     ON merchant USING gin (tags);
CREATE UNIQUE INDEX merchant_domain_uniq ON merchant (domain) WHERE domain IS NOT NULL;

CREATE TABLE merchant_location (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id     uuid REFERENCES merchant(id) ON DELETE CASCADE,
  raw_name        text NOT NULL,                -- brand from source, used by rollup
  store_number    text,
  address         text NOT NULL,
  city            text NOT NULL,
  region          text NOT NULL,
  postal_code     text,
  country         text NOT NULL DEFAULT 'US',
  lat             double precision,
  lon             double precision,
  phone           text,
  source          text NOT NULL,
  source_id       text NOT NULL,
  also_seen_in    jsonb NOT NULL DEFAULT '[]',
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX merchant_location_source_uniq ON merchant_location (source, source_id);
CREATE INDEX merchant_location_merchant_idx ON merchant_location (merchant_id);
CREATE INDEX merchant_location_region_city_idx ON merchant_location (region, city);
CREATE INDEX merchant_location_postal_region_idx ON merchant_location (postal_code, region);
CREATE INDEX merchant_location_store_number_idx ON merchant_location (store_number) WHERE store_number IS NOT NULL;
CREATE INDEX merchant_location_geo_idx ON merchant_location USING gist (ll_to_earth(lat, lon));
```

Note: `raw_name` lives on `merchant_location` so rollup can cluster by brand, not address.

---

## 4. NYC DOHMH importer (canonical example)

Endpoint: `https://data.cityofnewyork.us/resource/43nn-pn8j.json` — no key, paginated.

```ts
// scripts/import/merchants/nyc-dohmh.ts
import { db } from "@cobalt-web/db";
import { merchantLocation } from "@cobalt-web/db/schema/merchants/merchant-location";
import { sql } from "drizzle-orm";
import { normalizeName } from "./_lib/normalize";

const BASE = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
const PAGE = 50_000;

async function fetchPage(offset: number) {
  // collapse inspection rows → one per CAMIS via SoQL $group
  const url =
    `${BASE}?$select=camis,dba,boro,building,street,zipcode,phone,cuisine_description,latitude,longitude` +
    `&$group=camis,dba,boro,building,street,zipcode,phone,cuisine_description,latitude,longitude` +
    `&$limit=${PAGE}&$offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DOHMH ${res.status}`);
  return res.json() as Promise<any[]>;
}

for (let offset = 0; ; offset += PAGE) {
  const rows = await fetchPage(offset);
  if (rows.length === 0) break;

  const values = rows
    .filter((r) => r.dba && r.building && r.street)
    .map((r) => ({
      rawName: r.dba,
      address: `${r.building} ${r.street}`.trim(),
      city: r.boro,
      region: "NY",
      postalCode: r.zipcode ?? null,
      lat: r.latitude ? Number(r.latitude) : null,
      lon: r.longitude ? Number(r.longitude) : null,
      phone: r.phone ?? null,
      source: "nyc_dohmh",
      sourceId: String(r.camis),
    }));

  await db
    .insert(merchantLocation)
    .values(values)
    .onConflictDoUpdate({
      target: [merchantLocation.source, merchantLocation.sourceId],
      set: {
        rawName: sql`excluded.raw_name`,
        address: sql`excluded.address`,
        lat: sql`excluded.lat`,
        lon: sql`excluded.lon`,
        phone: sql`excluded.phone`,
        lastSeenAt: sql`now()`,
        updatedAt: sql`now()`,
      },
    });
  console.log(`offset=${offset} upserted=${values.length}`);
}
```

`_lib/normalize.ts`:

```ts
export function normalizeName(s: string) {
  return s
    .toLowerCase()
    .replace(/\b(inc|llc|corp|co|ltd)\b\.?/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

### NY Retail Food Stores (groceries vertical)

Endpoint: `https://data.ny.gov/resource/9a8c-vfzj.json` — no key.
Statewide grocery / convenience / supermarket licensing. ~30k rows. `category_system_key='groceries'`.

Field map:

| Source                                               | merchant_location  |
| ---------------------------------------------------- | ------------------ |
| `license_number`                                     | `source_id`        |
| `dba_name` (fallback `entity_name`)                  | `raw_name`         |
| `street_number` + `street_name` (+ `address_line_2`) | `address`          |
| `city`                                               | `city`             |
| `state`                                              | `region`           |
| `zip_code`                                           | `postal_code`      |
| `georeference.coordinates[1]`                        | `lat`              |
| `georeference.coordinates[0]`                        | `lon`              |
| `source`                                             | `"ny_retail_food"` |

Use SoQL paginate:

```
https://data.ny.gov/resource/9a8c-vfzj.json?$limit=50000&$offset=N
```

`georeference` returns GeoJSON Point — `{type:"Point",coordinates:[lon,lat]}`. Same upsert shape as DOHMH. Set rollup `category_system_key='groceries'` for this source (modify rollup SQL to read source → category map, or run separate rollup pass per source).

Other importers (`la-county.ts` CSV, `sf-dph.ts` Socrata, `osm-restaurants.ts` Overpass per state bbox) follow same shape: upsert on `(source, source_id)`, fill `raw_name`, leave `merchant_id` NULL.

---

## 5. Phase 2 — cross-source dedup SQL

`scripts/import/merchants/_sql/dedup.sql` (invoked by `dedup-locations.ts`):

```sql
BEGIN;

WITH candidates AS (
  SELECT a.id AS keep_id, b.id AS drop_id, b.source, b.source_id
  FROM merchant_location a
  JOIN merchant_location b
    ON a.id < b.id
   AND a.region = b.region
   AND a.postal_code IS NOT DISTINCT FROM b.postal_code
   AND similarity(
         regexp_replace(lower(a.address), '[^a-z0-9]', '', 'g'),
         regexp_replace(lower(b.address), '[^a-z0-9]', '', 'g')
       ) > 0.8
   AND similarity(
         regexp_replace(lower(a.raw_name), '[^a-z0-9]', '', 'g'),
         regexp_replace(lower(b.raw_name), '[^a-z0-9]', '', 'g')
       ) > 0.6
   AND a.lat IS NOT NULL AND b.lat IS NOT NULL
   AND earth_distance(ll_to_earth(a.lat, a.lon), ll_to_earth(b.lat, b.lon)) < 100
)
UPDATE merchant_location ml
   SET also_seen_in = ml.also_seen_in || jsonb_build_object('source', c.source, 'source_id', c.source_id),
       updated_at = now()
  FROM candidates c
 WHERE ml.id = c.keep_id;

DELETE FROM merchant_location ml
 USING candidates c
 WHERE ml.id = c.drop_id;

COMMIT;
```

Phone never used as match key (informational). Loop until zero candidates (multi-source piles).

---

## 6. Phase 3 — brand rollup SQL

`scripts/import/merchants/_sql/rollup.sql`:

```sql
BEGIN;

-- 1. create merchant row per (normalized raw_name, region cluster)
INSERT INTO merchant (canonical_name, name_normalized, category_system_key)
SELECT
  mode() WITHIN GROUP (ORDER BY raw_name) AS canonical_name,
  regexp_replace(lower(raw_name), '[^a-z0-9 ]+', ' ', 'g') AS name_normalized,
  'restaurants'
FROM merchant_location
WHERE merchant_id IS NULL
GROUP BY name_normalized
ON CONFLICT DO NOTHING;

-- 2. backfill FK
UPDATE merchant_location ml
   SET merchant_id = m.id,
       updated_at  = now()
  FROM merchant m
 WHERE ml.merchant_id IS NULL
   AND m.name_normalized = regexp_replace(lower(ml.raw_name), '[^a-z0-9 ]+', ' ', 'g');

-- 3. counts + chain flag
WITH counts AS (
  SELECT merchant_id, COUNT(*) AS n
  FROM merchant_location
  WHERE merchant_id IS NOT NULL
  GROUP BY merchant_id
)
UPDATE merchant m
   SET location_count = counts.n,
       is_chain       = counts.n >= 3,
       updated_at     = now()
  FROM counts
 WHERE m.id = counts.merchant_id;

COMMIT;
```

`rollup-merchants.ts` = thin wrapper that runs SQL + logs row counts pre/post.

---

## 7. Domain-fill flow (zero paid spend)

`scripts/import/merchants/domain-fill.ts`:

```
for each merchant WHERE domain IS NULL ORDER BY location_count DESC:

  attempts = []
  slug = canonical_name → lowercase → strip punct → join '-'

  candidates = [
    `${slug}.com`,
    `${slug}.co`,
    `the${slug}.com`,
    region === 'NY' ? `${slug}nyc.com` : null,
  ].filter(Boolean)

  for c in candidates:
    if domain_guess_attempts contains c: continue
    res = HEAD https://${c}    (5s timeout, follow redirects, UA = "CobaltBot/1.0 (+sriket@…)")
    attempts.push({domain: c, status: res?.status ?? 'err', at: now()})
    if res.status in [200,301,302]:
      UPDATE merchant SET domain = c WHERE id = $1
      break

  if still NULL:
    # OSM Overpass fallback — find website tag on a known location
    loc = pick any merchant_location for this merchant with lat/lon
    q = `[out:json];node[amenity=restaurant][name~"${canonical}",i](around:500,${loc.lat},${loc.lon});out tags 1;`
    res = POST https://overpass-api.de/api/interpreter (body=q)
    site = res.elements?.[0]?.tags?.website
    if site:
      domain = site.replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,'')
      UPDATE merchant SET domain = domain WHERE id = $1

  UPDATE merchant SET domain_guess_attempts = $attempts WHERE id = $1
```

Throttle: 20 parallel HEADs, global ≤50 RPS. Overpass: ≤1 RPS, retry on 429 with backoff.
Cache failures in `domain_guess_attempts` so reruns skip dead candidates.
Anything still NULL → leave NULL. Brandfetch lettermark UI handles it.

**Zero** Brandfetch /search, Foursquare, Google, Anthropic calls.

---

## 8. Match function (consumed by SRI-350)

```ts
findMerchantForTransaction({ name, city, region, lat, lon, storeNumber }) {
  // 1. trgm top-5 on merchant.name_normalized
  // 2. for each candidate: pull merchant_location WHERE merchant_id = c.id AND region = $region
  // 3. if storeNumber: exact match wins
  // 4. else if plaid lat/lon: pick min earth_distance < 1km
  // 5. else: pick (city, region) match; if multiple, LLM tie-break with 5 candidates
  // 6. return { merchant, location } | null
}
```

Directory is **read-only at txn write time** — copy fields onto `transaction` row, respect `lockedFields`. No JOIN at read time.

---

## 9. Scale targets

NYC ~26k · LA ~40k · SF ~7k · OSM US food ~200k raw → after dedup ~150k merchants / ~250k locations.

---

## 10. TODO checklist

- [ ] Worktree + sync-env
- [ ] Extensions on PlanetScale
- [ ] Drizzle schema (merchant + merchant_location, includes `raw_name`, `domain_guess_attempts`)
- [ ] Migration generate + apply
- [ ] NYC DOHMH importer (restaurants)
- [ ] NY Retail Food Stores importer (groceries, Socrata `9a8c-vfzj`)
- [ ] LA County CSV importer
- [ ] SF DPH Socrata importer
- [ ] OSM Overpass importer (state bbox)
- [ ] dedup-locations.ts
- [ ] rollup-merchants.ts
- [ ] domain-fill.ts
- [ ] Weekly cron registration
- [ ] `findMerchantForTransaction` match fn
- [ ] Wire into SRI-350 enrichment writer
- [ ] Telemetry: match / miss / ambiguous
