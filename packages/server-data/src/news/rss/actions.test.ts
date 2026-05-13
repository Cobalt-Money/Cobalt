import { describe, expect, it } from "vitest";
import { buildItemMetadata, parseDate, parseRssXml } from "./actions.js";

describe("parseRssXml", () => {
  it("extracts the feed title, description, and link", () => {
    const xml = `<?xml version="1.0"?>
<rss>
  <channel>
    <title>Example Feed</title>
    <description>A test feed</description>
    <link>https://example.com</link>
  </channel>
</rss>`;

    const parsed = parseRssXml(xml);

    expect(parsed?.title).toBe("Example Feed");
    expect(parsed?.description).toBe("A test feed");
    expect(parsed?.link).toBe("https://example.com");
  });

  it("prefers CDATA-wrapped feed titles over plain ones", () => {
    const xml = `<rss><channel>
      <title><![CDATA[CNBC Top News]]></title>
      <link>https://cnbc.com</link>
    </channel></rss>`;

    const parsed = parseRssXml(xml);

    expect(parsed?.title).toBe("CNBC Top News");
  });

  it("parses items with title, link, pubDate, guid, author, and categories", () => {
    const xml = `<rss><channel>
      <title>feed</title>
      <link>https://e.com</link>
      <item>
        <title><![CDATA[Chip shortage]]></title>
        <link>https://e.com/a1</link>
        <pubDate>Wed, 10 Apr 2026 14:00:00 GMT</pubDate>
        <guid isPermaLink="false">article-42</guid>
        <author>Jane Reporter</author>
        <category>Tech</category>
        <category><![CDATA[Semis]]></category>
        <description>Great read</description>
      </item>
    </channel></rss>`;

    const parsed = parseRssXml(xml);
    const item = parsed?.items[0];

    expect(parsed?.items).toHaveLength(1);
    expect(item?.title).toBe("Chip shortage");
    expect(item?.link).toBe("https://e.com/a1");
    expect(item?.pubDate).toBe("Wed, 10 Apr 2026 14:00:00 GMT");
    expect(item?.guid).toBe("article-42");
    expect(item?.author).toBe("Jane Reporter");
    expect(item?.category).toStrictEqual(["Tech", "Semis"]);
    expect(item?.description).toBe("Great read");
  });

  it("parses CNBC-style metadata: namespace-prefixed type/id/sponsored", () => {
    const xml = `<rss><channel>
      <title>CNBC</title>
      <link>https://cnbc.com</link>
      <item>
        <title>Markets roundup</title>
        <link>https://cnbc.com/x</link>
        <metadata:type>article</metadata:type>
        <metadata:id>107123</metadata:id>
        <metadata:sponsored>false</metadata:sponsored>
      </item>
    </channel></rss>`;

    const parsed = parseRssXml(xml);
    const item = parsed?.items[0];

    expect(item?.metadataType).toBe("article");
    expect(item?.metadataId).toBe("107123");
    expect(item?.metadataSponsored).toBe("false");
  });

  it("drops items that are missing either a title or a link", () => {
    const xml = `<rss><channel>
      <title>feed</title>
      <link>https://e.com</link>
      <item>
        <title>No link here</title>
      </item>
      <item>
        <link>https://e.com/no-title</link>
      </item>
      <item>
        <title>Keeper</title>
        <link>https://e.com/k</link>
      </item>
    </channel></rss>`;

    const parsed = parseRssXml(xml);

    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0]?.title).toBe("Keeper");
  });
});

describe("parseDate", () => {
  it("returns null when input is undefined", () => {
    expect(parseDate()).toBeNull();
  });

  it("parses a valid RFC 2822 date string", () => {
    const result = parseDate("Wed, 10 Apr 2026 14:00:00 GMT");
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe("2026-04-10T14:00:00.000Z");
  });

  it("returns null for an unparseable string", () => {
    expect(parseDate("not a date")).toBeNull();
  });
});

describe("buildItemMetadata", () => {
  it("returns null when no optional fields are present", () => {
    const result = buildItemMetadata({
      link: "https://e.com/a",
      title: "x",
    });
    expect(result).toBeNull();
  });

  it("includes author, categories, guid, and CNBC metadata when provided", () => {
    const result = buildItemMetadata({
      author: "Jane Reporter",
      category: ["Tech", "AI"],
      guid: "g-123",
      link: "https://e.com/a",
      metadataId: "10",
      metadataSponsored: "false",
      metadataType: "article",
      title: "x",
    });

    expect(result).toStrictEqual({
      author: "Jane Reporter",
      categories: ["Tech", "AI"],
      guid: "g-123",
      id: "10",
      sponsored: "false",
      type: "article",
    });
  });

  it("omits empty category arrays from the metadata object", () => {
    const result = buildItemMetadata({
      category: [],
      link: "https://e.com/a",
      title: "x",
    });

    expect(result).toBeNull();
  });
});
