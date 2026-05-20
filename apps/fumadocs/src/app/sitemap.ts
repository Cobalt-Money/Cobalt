import type { MetadataRoute } from "next";

import { source } from "@/lib/source";

const SITE_URL = "https://docs.cobaltpf.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = source.getPages().map((page) => ({
    url: `${SITE_URL}${page.url}`,
    lastModified: now,
  }));

  return [
    { url: SITE_URL, lastModified: now },
    { url: `${SITE_URL}/docs`, lastModified: now },
    ...pages,
  ];
}
