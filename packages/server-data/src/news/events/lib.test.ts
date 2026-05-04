import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";
import { eventArticles } from "@cobalt-web/db/schema/news";
import { createInsertSchema } from "drizzle-orm/zod";

import type { ProcessedArticle } from "./lib.js";
import { selectBestArticles, toEventArticleInsertRow, toFailedProcessedArticle } from "./lib.js";

const VALID_EVENT_ID = "11111111-1111-4111-8111-111111111111";
const eventArticleInsertSchema = createInsertSchema(eventArticles);

// Test helper — builds a realistic `StockNewsArticle` so every test doesn't
// repeat every field. Partial overrides pick what the test actually cares about.
function article(overrides: Partial<StockNewsArticle>): StockNewsArticle {
  return {
    date: "2026-04-10",
    image_url: "https://example.com/img.png",
    news_url: "https://example.com/a",
    sentiment: "neutral",
    source_name: "Reuters",
    text: "",
    tickers: ["NVDA"],
    title: "Untitled",
    topics: [],
    type: "Article",
    ...overrides,
  };
}

describe("selectBestArticles", () => {
  it("returns an empty list when there are no articles", () => {
    expect(selectBestArticles([], 5)).toStrictEqual([]);
  });

  it("dedupes by source_name in the first pass when the limit fits the unique count", () => {
    const input = [
      article({ source_name: "Reuters", title: "r1" }),
      article({ source_name: "Reuters", title: "r2" }),
      article({ source_name: "Bloomberg", title: "b1" }),
    ];

    // Limit = number of unique sources so the fill-up pass is a no-op.
    const result = selectBestArticles(input, 2);

    expect(result.map((a) => a.title)).toStrictEqual(["r1", "b1"]);
  });

  it("caps Article results at the given limit", () => {
    const input = Array.from({ length: 8 }, (_, i) =>
      article({ source_name: `src-${i}`, title: `a${i}` }),
    );

    const result = selectBestArticles(input, 3);

    expect(result.filter((a) => a.type === "Article")).toHaveLength(3);
  });

  it("appends exactly one Video on top of the article cap", () => {
    const input = [
      article({ source_name: "A", title: "a" }),
      article({ source_name: "B", title: "b" }),
      article({ source_name: "CNBC", title: "v1", type: "Video" }),
      article({ source_name: "CNBC2", title: "v2", type: "Video" }),
    ];

    const result = selectBestArticles(input, 5);

    const videos = result.filter((a) => a.type === "Video");
    expect(videos).toHaveLength(1);
    expect(videos[0]?.title).toBe("v1");
  });

  it("fills remaining slots with duplicate-source articles once unique sources are exhausted", () => {
    const input = [
      article({ source_name: "Reuters", title: "r1" }),
      article({ source_name: "Reuters", title: "r2" }),
      article({ source_name: "Bloomberg", title: "b1" }),
      article({ source_name: "Bloomberg", title: "b2" }),
    ];

    const result = selectBestArticles(input, 4);

    const articleTitles = result.filter((a) => a.type === "Article").map((a) => a.title);
    expect(articleTitles).toHaveLength(4);
    expect(articleTitles).toContain("r1");
    expect(articleTitles).toContain("b1");
    expect(articleTitles).toContain("r2");
    expect(articleTitles).toContain("b2");
  });
});

function processed(source: StockNewsArticle): ProcessedArticle {
  return {
    extractedContent: { text: "body", title: source.title },
    originalArticle: source,
    processingMetadata: {
      contentLength: 4,
      extractionTime: 0,
      processedAt: new Date(),
      success: true,
    },
  };
}

describe("toEventArticleInsertRow", () => {
  it("produces a row that parses against the event_articles insert schema", () => {
    const row = toEventArticleInsertRow(
      VALID_EVENT_ID,
      processed(
        article({
          news_url: "https://example.com/a",
          source_name: "Bloomberg",
          title: "Chip demand rises",
        }),
      ),
    );

    expect(() => eventArticleInsertSchema.parse(row)).not.toThrow();
  });

  it("maps vendor fields onto the DB column shape (snake → camel, string → Date)", () => {
    const row = toEventArticleInsertRow(
      VALID_EVENT_ID,
      processed(
        article({
          date: "2026-04-10T12:00:00Z",
          image_url: "https://cdn.example.com/img.png",
          news_url: "https://example.com/a",
          source_name: "Reuters",
          tickers: ["NVDA", "AMD"],
          title: "Chip shortage report",
          topics: ["earnings"],
          type: "Article",
        }),
      ),
    );

    expect(row).toMatchObject({
      financialEventId: VALID_EVENT_ID,
      imageUrl: "https://cdn.example.com/img.png",
      newsUrl: "https://example.com/a",
      sourceName: "Reuters",
      text: "Chip shortage report",
      tickers: ["NVDA", "AMD"],
      title: "Chip shortage report",
      topics: ["earnings"],
      type: "Article",
    });
    expect(row.date).toBeInstanceOf(Date);
    expect(row.date?.toISOString()).toBe("2026-04-10T12:00:00.000Z");
  });

  it("coerces a falsy article date to null and undefined image_url to null", () => {
    const stripped = article({
      date: "",
      image_url: undefined,
    });
    const row = toEventArticleInsertRow(VALID_EVENT_ID, processed(stripped));

    expect(row.date).toBeNull();
    expect(row.imageUrl).toBeNull();
  });
});

describe("toFailedProcessedArticle", () => {
  it("preserves the article title and image while flagging success: false", () => {
    const source = article({
      image_url: "https://cdn.example.com/img.jpg",
      title: "Chip shortage deepens",
    });

    const result = toFailedProcessedArticle(source, "HTTP 403: Forbidden");

    expect(result.originalArticle).toBe(source);
    expect(result.extractedContent.title).toBe("Chip shortage deepens");
    expect(result.extractedContent.image).toBe("https://cdn.example.com/img.jpg");
    expect(result.processingMetadata.success).toBeFalsy();
    expect(result.processingMetadata.error).toBe("HTTP 403: Forbidden");
    expect(result.processingMetadata.contentLength).toBe(0);
  });
});
