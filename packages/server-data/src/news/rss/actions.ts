export interface RssItem {
  title: string;
  description?: string;
  link: string;
  pubDate?: string;
  guid?: string;
  author?: string;
  category?: string[];
  metadataType?: string;
  metadataId?: string;
  metadataSponsored?: string;
}

export interface ParsedRssFeed {
  title: string;
  description: string;
  link: string;
  items: RssItem[];
}

const RSS_FETCH_TIMEOUT_MS = 30_000;

export async function fetchRssFeedXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Cobalt-RSS/1.0" },
    signal: AbortSignal.timeout(RSS_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`RSS fetch failed: ${response.status} ${url}`);
  }
  return response.text();
}

export function parseRssXml(xmlContent: string): ParsedRssFeed | null {
  try {
    const titleMatch = xmlContent.match(
      /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/
    );
    const descriptionMatch = xmlContent.match(
      /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/
    );
    const linkMatch = xmlContent.match(/<link>(.*?)<\/link>/);

    const title = titleMatch?.[1] ?? titleMatch?.[2] ?? "";
    const description = descriptionMatch?.[1] ?? descriptionMatch?.[2] ?? "";
    const link = linkMatch?.[1] ?? "";

    const itemMatches = xmlContent.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const items: RssItem[] = itemMatches
      .map(parseItem)
      .filter((item): item is RssItem => Boolean(item.title && item.link));

    return { description, items, link, title };
  } catch {
    return null;
  }
}

function parseItem(itemXml: string): RssItem {
  const titleMatch = itemXml.match(
    /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/
  );
  const descriptionMatch = itemXml.match(
    /<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/
  );
  const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
  const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
  const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/);
  const authorMatch = itemXml.match(
    /<author><!\[CDATA\[(.*?)\]\]><\/author>|<author>(.*?)<\/author>/
  );
  const categoryMatches =
    itemXml.match(
      /<category><!\[CDATA\[(.*?)\]\]><\/category>|<category>(.*?)<\/category>/g
    ) ?? [];
  const categories = categoryMatches
    .map((cat) => {
      // Must require [^<]+ (not .*?) in the plain branch — otherwise the engine
      // matches the empty gap between `<category>` and the inner `<![CDATA[`
      // and drops the CDATA category entirely.
      const catMatch = cat.match(/<!\[CDATA\[(.*?)\]\]>|>([^<]+)</);
      return catMatch?.[1] ?? catMatch?.[2] ?? "";
    })
    .filter(Boolean);

  const metadataTypeMatch = itemXml.match(
    /<metadata:type>(.*?)<\/metadata:type>/
  );
  const metadataIdMatch = itemXml.match(/<metadata:id>(.*?)<\/metadata:id>/);
  const metadataSponsoredMatch = itemXml.match(
    /<metadata:sponsored>(.*?)<\/metadata:sponsored>/
  );

  return {
    author: authorMatch?.[1] ?? authorMatch?.[2],
    category: categories,
    description: descriptionMatch?.[1] ?? descriptionMatch?.[2] ?? "",
    guid: guidMatch?.[1],
    link: linkMatch?.[1] ?? "",
    metadataId: metadataIdMatch?.[1],
    metadataSponsored: metadataSponsoredMatch?.[1],
    metadataType: metadataTypeMatch?.[1],
    pubDate: pubDateMatch?.[1],
    title: titleMatch?.[1] ?? titleMatch?.[2] ?? "",
  };
}

export function parseDate(dateString?: string): Date | null {
  if (!dateString) {
    return null;
  }
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function buildItemMetadata(
  item: RssItem
): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {};
  if (item.author) {
    metadata.author = item.author;
  }
  if (item.category && item.category.length > 0) {
    metadata.categories = item.category;
  }
  if (item.guid) {
    metadata.guid = item.guid;
  }
  if (item.metadataType) {
    metadata.type = item.metadataType;
  }
  if (item.metadataId) {
    metadata.id = item.metadataId;
  }
  if (item.metadataSponsored) {
    metadata.sponsored = item.metadataSponsored;
  }
  return Object.keys(metadata).length > 0 ? metadata : null;
}
