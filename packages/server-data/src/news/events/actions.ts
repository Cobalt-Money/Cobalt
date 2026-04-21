import { stockNewsRequest } from "@cobalt-web/clients/stock-news";
import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

import type { ProcessedArticle } from "./lib.js";

// ─── Stock News API ──────────────────────────────────────────────────────────

export interface StockNewsEvent {
  event_name: string;
  event_text?: string;
  event_id: string;
  news_items: number;
  date: string;
  tickers: string[];
}

interface StockNewsEventsResponse {
  data: StockNewsEvent[];
  total_pages: number;
}

interface StockNewsEventArticlesResponse {
  event_name: string;
  event_text?: string;
  data: StockNewsArticle[];
}

export async function fetchRecentEvents(): Promise<StockNewsEvent[]> {
  const response = await stockNewsRequest<StockNewsEventsResponse>("/events", {
    page: "1",
  });
  if (!response.data) {
    throw new Error("Stock News API returned no events");
  }
  return response.data;
}

export async function fetchArticlesForEvent(
  eventId: string,
  items = 20
): Promise<StockNewsArticle[]> {
  const response = await stockNewsRequest<StockNewsEventArticlesResponse>(
    "/events",
    {
      eventid: eventId,
      items: items.toString(),
      page: "1",
    }
  );
  if (!response.data) {
    throw new Error(`Stock News API returned no articles for ${eventId}`);
  }
  return response.data;
}

// ─── Article content extraction (fetch + Readability) ────────────────────────

const REQUEST_TIMEOUT_MS = 30_000;

const BROWSER_HEADERS = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "max-age=0",
  DNT: "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.text();
}

const swallowConsoleError = (..._args: unknown[]): void => undefined;

function extractWithReadability(
  html: string,
  url: string
): ReturnType<Readability["parse"]> | null {
  // Suppress DOM parser noise during Readability extraction.
  const originalConsoleError = console.error;
  console.error = swallowConsoleError;
  try {
    const { document } = parseHTML(html);
    // Readability reads documentURI for resolving relative links. linkedom
    // doesn't set it from an input URL, so assign it before parse.
    Object.defineProperty(document, "documentURI", {
      configurable: true,
      value: url,
    });
    return new Readability(document as never).parse();
  } finally {
    console.error = originalConsoleError;
  }
}

function failedArticleResult(
  article: StockNewsArticle,
  error: string,
  startedAt: number
): ProcessedArticle {
  return {
    extractedContent: {
      image: article.image_url,
      text: "",
      title: article.title,
    },
    originalArticle: article,
    processingMetadata: {
      contentLength: 0,
      error,
      extractionTime: Date.now() - startedAt,
      processedAt: new Date(),
      success: false,
    },
  };
}

function successArticleResult(
  article: StockNewsArticle,
  extracted: ReturnType<Readability["parse"]> | null,
  startedAt: number
): ProcessedArticle {
  return {
    extractedContent: {
      author: extracted?.byline ?? undefined,
      excerpt: extracted?.excerpt ?? undefined,
      image: article.image_url,
      publishedTime: extracted?.publishedTime ?? undefined,
      siteName: extracted?.siteName ?? undefined,
      text: extracted?.textContent ?? "",
      title: extracted?.title ?? article.title,
    },
    originalArticle: article,
    processingMetadata: {
      contentLength: extracted?.textContent?.length ?? 0,
      extractionTime: Date.now() - startedAt,
      processedAt: new Date(),
      success: true,
    },
  };
}

export async function fetchArticleContent(
  article: StockNewsArticle
): Promise<ProcessedArticle> {
  const startedAt = Date.now();

  try {
    const html = await fetchHtml(article.news_url);
    const extracted = extractWithReadability(html, article.news_url);
    return successArticleResult(article, extracted, startedAt);
  } catch (error) {
    return failedArticleResult(
      article,
      error instanceof Error ? error.message : String(error),
      startedAt
    );
  }
}
