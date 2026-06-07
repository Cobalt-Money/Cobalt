/**
 * SRI-352 — Phase 4 domain fill (zero paid API).
 *
 * For each merchant with domain IS NULL:
 *   1. Guess <slug>.com / .co / the<slug>.com via HEAD (5s timeout)
 *   2. OSM Overpass fallback — match name near a known location, read website tag
 *
 * Cache attempts in merchant.domain_guess_attempts so reruns skip dead candidates.
 * Throttle: 20 parallel, ~50 RPS.
 */
import { and, eq, isNull, sql } from "drizzle-orm";

import { db, merchant, pool } from "./_lib/db";

const CONCURRENCY = 20;
const HEAD_TIMEOUT_MS = 5000;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const UA = "CobaltBot/1.0 (+sriket@cobaltpf.com)";

interface Attempt {
  domain: string;
  status: number | "err";
  at: string;
}

const QUALIFIERS = new Set([
  "mexican",
  "grill",
  "kitchen",
  "bar",
  "restaurant",
  "restaurants",
  "pizza",
  "pizzeria",
  "deli",
  "diner",
  "cafe",
  "coffee",
  "bakery",
  "chicken",
  "fried",
  "burger",
  "burgers",
  "bbq",
  "steakhouse",
  "house",
  "sushi",
  "thai",
  "chinese",
  "italian",
  "indian",
  "japanese",
  "shop",
  "store",
  "market",
  "supermarket",
  "grocery",
  "groceries",
  "company",
  "corp",
  "inc",
  "llc",
  "co",
  "ltd",
  "the",
  "and",
  "of",
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "")
    .trim();
}

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function candidates(canonical: string, region: string | null): string[] {
  const all = tokens(canonical);
  if (all.length === 0) {
    return [];
  }
  const meaningful = all.filter((t) => !QUALIFIERS.has(t));
  const full = slugify(all.join(""));
  const meaningfulSlug = slugify(meaningful.join(""));
  const firstWord = slugify(all[0]!);
  const firstMeaningful = meaningful[0] ? slugify(meaningful[0]) : "";
  const acronym = meaningful.length >= 2 ? meaningful.map((t) => t[0]).join("") : "";

  const seeds = new Set<string>();
  if (full.length >= 3) {
    seeds.add(full);
  }
  if (meaningfulSlug.length >= 3 && meaningfulSlug !== full) {
    seeds.add(meaningfulSlug);
  }
  if (firstWord.length >= 3 && firstWord !== full) {
    seeds.add(firstWord);
  }
  if (firstMeaningful.length >= 3 && firstMeaningful !== firstWord) {
    seeds.add(firstMeaningful);
  }
  if (acronym.length >= 3) {
    seeds.add(acronym);
  }

  const out: string[] = [];
  for (const seed of seeds) {
    out.push(`${seed}.com`);
    out.push(`${seed}.co`);
    out.push(`the${seed}.com`);
    if (region === "NY") {
      out.push(`${seed}nyc.com`);
    }
  }
  return out;
}

async function headCheck(domain: string): Promise<number | "err"> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { "User-Agent": UA },
      method: "HEAD",
      redirect: "manual",
      signal: ctrl.signal,
    });
    return res.status;
  } catch {
    return "err";
  } finally {
    clearTimeout(timer);
  }
}

async function overpassWebsite(
  canonical: string,
  lat: number,
  lon: number,
): Promise<string | null> {
  const escaped = canonical.replaceAll(/["\\]/g, " ").trim();
  const q = `[out:json][timeout:25];(node[amenity~"restaurant|cafe|fast_food"][name~"${escaped}",i](around:1000,${lat},${lon}););out tags 1;`;
  try {
    const res = await fetch(OVERPASS_URL, {
      body: q,
      headers: { "Content-Type": "text/plain", "User-Agent": UA },
      method: "POST",
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      return null;
    }
    const json = (await res.json()) as { elements?: { tags?: Record<string, string> }[] };
    const site = json.elements?.[0]?.tags?.website;
    if (!site) {
      return null;
    }
    return site
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

async function processOne(m: {
  id: string;
  canonical_name: string;
  domain_guess_attempts: Attempt[];
  region: string | null;
  lat: number | null;
  lon: number | null;
}): Promise<{ id: string; found: boolean }> {
  const attempted = new Set((m.domain_guess_attempts ?? []).map((a) => a.domain));
  const attempts: Attempt[] = [...(m.domain_guess_attempts ?? [])];

  for (const c of candidates(m.canonical_name, m.region)) {
    if (attempted.has(c)) {
      continue;
    }
    const status = await headCheck(c);
    attempts.push({ at: new Date().toISOString(), domain: c, status });
    if (status === 200 || status === 301 || status === 302) {
      try {
        await db
          .update(merchant)
          .set({ domain: c, domainGuessAttempts: attempts as never, updatedAt: new Date() })
          .where(eq(merchant.id, m.id));
        return { found: true, id: m.id };
      } catch {
        // domain unique conflict → another merchant already claimed; continue
      }
    }
  }

  if (m.lat !== null && m.lon !== null) {
    const site = await overpassWebsite(m.canonical_name, m.lat, m.lon);
    if (site) {
      try {
        await db
          .update(merchant)
          .set({ domain: site, domainGuessAttempts: attempts as never, updatedAt: new Date() })
          .where(eq(merchant.id, m.id));
        return { found: true, id: m.id };
      } catch {
        // unique conflict; fall through
      }
    }
  }

  await db
    .update(merchant)
    .set({ domainGuessAttempts: attempts as never, updatedAt: new Date() })
    .where(eq(merchant.id, m.id));
  return { found: false, id: m.id };
}

async function main() {
  const start = Date.now();

  const rows = await db.execute<{
    id: string;
    canonical_name: string;
    domain_guess_attempts: Attempt[];
    region: string | null;
    lat: number | null;
    lon: number | null;
  }>(sql`
    SELECT m.id,
           m.canonical_name,
           m.domain_guess_attempts,
           sub.region,
           sub.lat,
           sub.lon
    FROM merchant m
    LEFT JOIN LATERAL (
      SELECT region, lat, lon
      FROM merchant_location
      WHERE merchant_id = m.id AND lat IS NOT NULL AND lon IS NOT NULL
      LIMIT 1
    ) sub ON TRUE
    WHERE m.domain IS NULL AND m.deleted_at IS NULL
    ORDER BY m.location_count DESC
  `);

  console.log(`[domain-fill] candidates=${rows.rows.length}`);
  let found = 0;
  let processed = 0;

  let cursor = 0;
  async function worker(id: number) {
    while (cursor < rows.rows.length) {
      const idx = cursor++;
      const m = rows.rows[idx]!;
      try {
        const r = await processOne(m);
        if (r.found) {
          found++;
        }
      } catch (error) {
        console.warn(`[domain-fill] worker=${id} id=${m.id} err=${String(error)}`);
      }
      processed++;
      if (processed % 100 === 0) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        console.log(
          `[domain-fill] processed=${processed}/${rows.rows.length} found=${found} elapsed=${elapsed}s`,
        );
      }
      // soft throttle
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[domain-fill] DONE processed=${processed} found=${found} elapsed=${elapsed}s`);
  await pool.end();
}

main().catch((error) => {
  console.error("[domain-fill] FAILED:", error);
  process.exit(1);
});
