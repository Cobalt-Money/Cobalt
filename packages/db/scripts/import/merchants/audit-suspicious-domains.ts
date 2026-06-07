/**
 * SRI-352 — flag suspicious domains for manual review.
 * Writes logs/suspicious-domains.tsv (TAB-separated) — open in editor, fix, paste-back as SQL.
 * NO writes to DB. Detection only.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { sql } from "drizzle-orm";

import { db, pool } from "./_lib/db";

const BAD_DOMAINS = new Set([
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "yelp.com",
  "tripadvisor.com",
  "doordash.com",
  "ubereats.com",
  "grubhub.com",
  "seamless.com",
  "postmates.com",
  "linktr.ee",
  "sites.google.com",
  "google.com",
  "wix.com",
  "wixsite.com",
  "squarespace.com",
  "godaddy.com",
  "weebly.com",
  "blogspot.com",
  "wordpress.com",
  "shopify.com",
  "myshopify.com",
  "ezcater.com",
  "menulog.com",
  "keeq.io",
]);

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function domainSlug(domain: string): string {
  const parts = domain.split(".");
  return parts[0] ?? "";
}

async function main() {
  const rows = await db.execute<{
    id: string;
    canonical_name: string;
    domain: string;
    location_count: number;
    is_chain: boolean;
  }>(sql`
    SELECT id, canonical_name, domain, location_count, is_chain
    FROM merchant
    WHERE domain IS NOT NULL
      AND domain_source = 'google_places'
    ORDER BY is_chain DESC, location_count DESC;
  `);

  const out: {
    reason: string;
    id: string;
    name: string;
    domain: string;
    count: number;
    chain: string;
  }[] = [];

  for (const r of rows.rows) {
    const d = r.domain.toLowerCase();
    let reason: string | null = null;

    if (BAD_DOMAINS.has(d)) {
      reason = "blacklist";
    } else {
      const slug = domainSlug(d);
      const nameToks = tokens(r.canonical_name);
      const hit = nameToks.some((t) => slug.includes(t) || t.includes(slug));
      if (!hit && slug.length >= 3) {
        reason = "no_name_match";
      }
    }

    if (reason) {
      out.push({
        chain: r.is_chain ? "Y" : "n",
        count: r.location_count,
        domain: r.domain,
        id: r.id,
        name: r.canonical_name,
        reason,
      });
    }
  }

  const tsv =
    "reason\tlocations\tchain\tname\tdomain\tid\n" +
    out
      .map((r) => `${r.reason}\t${r.count}\t${r.chain}\t${r.name}\t${r.domain}\t${r.id}`)
      .join("\n");

  const path = resolve(process.cwd(), "logs/suspicious-domains.tsv");
  writeFileSync(path, tsv);
  console.log(`[audit] wrote ${out.length} flagged domains → ${path}`);
  console.log(
    `[audit] blacklist=${out.filter((r) => r.reason === "blacklist").length} no_name_match=${out.filter((r) => r.reason === "no_name_match").length}`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error("[audit] FAILED:", error);
  process.exit(1);
});
