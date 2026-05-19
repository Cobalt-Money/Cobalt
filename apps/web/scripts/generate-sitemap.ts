import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SITE_URL = "https://cobaltpf.com";
const BLOG_DIR = join(import.meta.dirname, "..", "content", "blog");
const OUT = join(import.meta.dirname, "..", "public", "sitemap.xml");

const STATIC_PATHS = ["/", "/pricing", "/blog", "/privacy", "/terms"];

function blogSlugs(): string[] {
  try {
    return readdirSync(BLOG_DIR)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
}

function urlEntry(path: string, lastmod?: string): string {
  const loc = `${SITE_URL}${path}`;
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`;
}

const [today] = new Date().toISOString().split("T");
const urls = [
  ...STATIC_PATHS.map((p) => urlEntry(p, today)),
  ...blogSlugs().map((slug) => urlEntry(`/blog/${slug}`, today)),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

writeFileSync(OUT, xml);
console.log(`Wrote ${urls.length} urls to ${OUT}`);
