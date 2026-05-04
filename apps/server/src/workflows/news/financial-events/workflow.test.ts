import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";
import { financialEvents } from "@cobalt-web/db/schema/news";
import {
  fetchArticleContent,
  fetchArticlesForEvent,
} from "@cobalt-web/server-data/news/events/actions";
import type { StockNewsEvent } from "@cobalt-web/server-data/news/events/actions";
import type { EventSummary, ProcessedArticle } from "@cobalt-web/server-data/news/events/lib";
import {
  applyEventSummary,
  replaceEventArticles,
  upsertFinancialEventHeader,
} from "@cobalt-web/server-data/news/events/mutations";
import { createInsertSchema } from "drizzle-orm/zod";
import { beforeEach, vi } from "vitest";

import { summarizeEventArticles } from "../../../ai/agents/financial-events-summary/financial-events-summary-agent.js";
import { processFinancialEventWorkflow } from "./workflow.js";

// `vi.mock` calls are hoisted to the top of the module at compile time, so
// placing them below the imports is safe — vitest rewires the bindings before
// any code runs. `"use workflow"` / `"use step"` are no-ops without the
// workflow compiler, so we can call the workflow as plain async JS and assert
// on mutation call args.
vi.mock(import("@cobalt-web/server-data/news/events/actions"), () => ({
  fetchArticleContent: vi.fn(),
  fetchArticlesForEvent: vi.fn(),
  fetchRecentEvents: vi.fn(),
}));
vi.mock(import("@cobalt-web/server-data/news/events/mutations"), () => ({
  applyEventSummary: vi.fn(),
  replaceEventArticles: vi.fn(),
  upsertFinancialEventHeader: vi.fn(),
}));
vi.mock(
  import("../../../ai/agents/financial-events-summary/financial-events-summary-agent.js"),
  async () => {
    const actual = await vi.importActual<
      typeof import("../../../ai/agents/financial-events-summary/financial-events-summary-agent.js")
    >("../../../ai/agents/financial-events-summary/financial-events-summary-agent.js");
    return {
      ...actual,
      summarizeEventArticles: vi.fn(),
    };
  },
);

const mockFetchArticles = vi.mocked(fetchArticlesForEvent);
const mockFetchArticleContent = vi.mocked(fetchArticleContent);
const mockUpsertHeader = vi.mocked(upsertFinancialEventHeader);
const mockReplaceArticles = vi.mocked(replaceEventArticles);
const mockApplySummary = vi.mocked(applyEventSummary);
const mockSummarize = vi.mocked(summarizeEventArticles);

// The workflow hands its vendor → DB mapping off to the mutation layer, so the
// only DB-shape boundary the workflow itself crosses is the event header.
// (The per-article insert shape is verified in mutations.test.ts.)
const financialEventInsertSchema = createInsertSchema(financialEvents);

const FIXED_ID = "11111111-1111-4111-8111-111111111111";

const bloombergArticle: StockNewsArticle = {
  date: "2026-04-10",
  image_url: "https://cdn.bloomberg.com/img.png",
  news_url: "https://bloomberg.com/article-1",
  sentiment: "neutral",
  source_name: "Bloomberg",
  text: "",
  tickers: ["NVDA"],
  title: "NVIDIA beats estimates",
  topics: ["earnings"],
  type: "Article",
};

function stockEvent(overrides: Partial<StockNewsEvent> = {}): StockNewsEvent {
  return {
    date: "2026-04-10T00:00:00Z",
    event_id: "evt-nvda-2026-q1",
    event_name: "NVIDIA Q1 earnings",
    event_text: "Earnings beat on datacenter strength.",
    news_items: 12,
    tickers: ["NVDA"],
    ...overrides,
  };
}

function scraped(article: StockNewsArticle): ProcessedArticle {
  return {
    extractedContent: {
      author: "Reporter",
      publishedTime: "2026-04-10T12:00:00Z",
      text: "Full article body extracted via Readability…",
      title: article.title,
    },
    originalArticle: article,
    processingMetadata: {
      contentLength: 50,
      extractionTime: 200,
      processedAt: new Date(),
      success: true,
    },
  };
}

function summary(): EventSummary {
  return {
    articleCount: 1,
    eventSummary: "NVIDIA beat estimates with strong datacenter growth.",
    keyPoints: ["Datacenter up", "Gaming flat", "Guidance raised", "EPS beat"],
    overallSentiment: "positive",
    processingMetadata: {
      model: "google/gemini-2.5-flash",
      processingTime: 1200,
      success: true,
      summarizedAt: new Date(),
    },
    topics: ["earnings", "tech"],
  };
}

describe("processFinancialEventWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertHeader.mockResolvedValue(FIXED_ID);
  });

  it("passes a shape that matches financialEvents insert schema to upsertFinancialEventHeader", async () => {
    mockFetchArticles.mockResolvedValueOnce([bloombergArticle]);
    mockFetchArticleContent.mockResolvedValueOnce(scraped(bloombergArticle));
    mockSummarize.mockResolvedValueOnce(summary());

    await processFinancialEventWorkflow(stockEvent());

    expect(mockUpsertHeader).toHaveBeenCalledOnce();
    const passed = mockUpsertHeader.mock.calls[0]?.[0];
    // `.parse()` throws if shape is wrong — the error message names the bad field.
    expect(() => financialEventInsertSchema.parse(passed)).not.toThrow();
    expect(passed).toMatchObject({
      eventId: "evt-nvda-2026-q1",
      eventName: "NVIDIA Q1 earnings",
      eventText: "Earnings beat on datacenter strength.",
      newsItems: 12,
      tickers: ["NVDA"],
    });
    expect(passed?.date).toBeInstanceOf(Date);
  });

  it("hands the persisted ProcessedArticle[] and the returned event record id to replaceEventArticles", async () => {
    mockFetchArticles.mockResolvedValueOnce([bloombergArticle]);
    mockFetchArticleContent.mockResolvedValueOnce(scraped(bloombergArticle));
    mockSummarize.mockResolvedValueOnce(summary());

    await processFinancialEventWorkflow(stockEvent());

    expect(mockReplaceArticles).toHaveBeenCalledOnce();
    const [eventRecordId, rows] = mockReplaceArticles.mock.calls[0] ?? [];
    expect(eventRecordId).toBe(FIXED_ID);
    expect(rows).toHaveLength(1);
    // The workflow passes ProcessedArticle instances — the mutation layer is
    // responsible for mapping to the DB row shape (see mutations.test.ts).
    expect(rows?.[0]?.originalArticle.news_url).toBe("https://bloomberg.com/article-1");
  });

  it("writes the summary, sentiment, topics, and scraped count back to the event record", async () => {
    mockFetchArticles.mockResolvedValueOnce([bloombergArticle]);
    mockFetchArticleContent.mockResolvedValueOnce(scraped(bloombergArticle));
    const s = summary();
    mockSummarize.mockResolvedValueOnce(s);

    await processFinancialEventWorkflow(stockEvent());

    expect(mockApplySummary).toHaveBeenCalledWith(FIXED_ID, s, 1);
  });

  it("skips summarization when every article fails to scrape, and still persists article placeholders", async () => {
    mockFetchArticles.mockResolvedValueOnce([bloombergArticle]);
    // processArticleStep's FatalError path: agent never gets called.
    mockFetchArticleContent.mockRejectedValueOnce(new Error("HTTP 403"));

    const result = await processFinancialEventWorkflow(stockEvent());

    expect(mockSummarize).not.toHaveBeenCalled();
    expect(mockReplaceArticles).toHaveBeenCalledOnce();
    // The failed article still gets persisted as a placeholder so the
    // source + image metadata are preserved.
    expect(mockReplaceArticles.mock.calls[0]?.[1]).toHaveLength(1);
    expect(result.articlesScraped).toBe(0);
    expect(result.articlesPersisted).toBe(1);
  });

  it("returns a success result with the scraped + persisted counts on the happy path", async () => {
    mockFetchArticles.mockResolvedValueOnce([bloombergArticle]);
    mockFetchArticleContent.mockResolvedValueOnce(scraped(bloombergArticle));
    mockSummarize.mockResolvedValueOnce(summary());

    const result = await processFinancialEventWorkflow(stockEvent());

    expect(result.success).toBeTruthy();
    expect(result.eventId).toBe("evt-nvda-2026-q1");
    expect(result.articlesScraped).toBe(1);
    expect(result.articlesPersisted).toBe(1);
    expect(result.error).toBeUndefined();
  });

  it("returns a failure result when the fetch step throws (not a scrape failure)", async () => {
    mockFetchArticles.mockRejectedValueOnce(new Error("Stock News API is down"));

    const result = await processFinancialEventWorkflow(stockEvent());

    expect(result.success).toBeFalsy();
    expect(result.error).toBe("Stock News API is down");
    expect(mockReplaceArticles).not.toHaveBeenCalled();
    expect(mockApplySummary).not.toHaveBeenCalled();
  });
});
