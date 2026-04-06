import { stockNewsAPI } from "@cobalt-web/clients/stock-news";
import type {
  StockNewsEvent,
  StockNewsArticle,
} from "@cobalt-web/clients/stock-news";
import type {
  FinancialEventInsert,
  EventArticleInsert,
} from "@cobalt-web/db/schema/features";
import { ArticleProcessor } from "@cobalt-web/server-data/news/article-processor";
import type { ProcessedArticle } from "@cobalt-web/server-data/news/article-processor";
import { ArticleSummarizer } from "@cobalt-web/server-data/news/article-summarizer";
import {
  findEventByEventId,
  insertFinancialEvent,
  updateFinancialEvent,
  deleteArticlesByEventId,
  insertEventArticles,
  updateEventSummary,
} from "@cobalt-web/server-data/news/events/mutations";
import { FatalError, RetryableError } from "workflow";

// Re-export for workflow.ts
export type { ProcessedArticle };

/**
 * Step 1: Ensure event record exists in database
 * Business logic: check if exists, then update OR insert
 */
export async function ensureEventRecord(event: StockNewsEvent) {
  "use step";

  // Check if event already exists
  const existing = await findEventByEventId(event.event_id);

  if (existing) {
    // Update existing event
    await updateFinancialEvent(existing.id, {
      date: event.date ? new Date(event.date) : null,
      eventName: event.event_name,
      eventText: event.event_text,
      newsItems: event.news_items,
      tickers: event.tickers,
    });
    return { event, eventRecordId: existing.id };
  }

  // Create new event record
  const newEvent: FinancialEventInsert = {
    date: event.date ? new Date(event.date) : null,
    eventId: event.event_id,
    eventName: event.event_name,
    eventText: event.event_text,
    newsItems: event.news_items,
    tickers: event.tickers,
  };

  const inserted = await insertFinancialEvent(newEvent);
  return { event, eventRecordId: inserted.id };
}

/**
 * Step 2: Fetch articles from Stock News API
 * Retrieves articles for the event from the external API
 */
export async function fetchEventArticles(eventId: string) {
  "use step";

  try {
    const articlesResponse = await stockNewsAPI.getEventArticles(eventId, 20);

    if (!articlesResponse.data) {
      throw new Error(`Failed to fetch articles: No data returned`);
    }

    return articlesResponse.data;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const responseStatus =
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "status" in error.response &&
      typeof error.response.status === "number"
        ? error.response.status
        : undefined;

    // Handle rate limiting
    if (
      errorMessage.includes("rate limit") ||
      errorMessage.includes("429") ||
      responseStatus === 429
    ) {
      throw new RetryableError("Stock News API rate limited", {
        retryAfter: "1m",
      });
    }

    // Handle timeouts and network errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("network") ||
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      throw new RetryableError(`Network error: ${errorMessage}`, {
        retryAfter: "10s",
      });
    }

    // Re-throw other errors for default retry behavior
    throw error;
  }
}

// Set max retries to prevent infinite loops
fetchEventArticles.maxRetries = 3; // 4 total attempts

/**
 * Step 3: Select best articles (filtering/prioritization)
 * Filters and prioritizes articles (up to 5 articles + 1 video)
 */
export function selectBestArticles(articles: StockNewsArticle[], limit = 5) {
  "use step";

  const selectedArticles: StockNewsArticle[] = [];
  const seenSources = new Set<string>();
  const targetArticleCount = limit;
  let videoAdded = false;

  // First pass: collect articles (type: "Article")
  for (const article of articles) {
    if (
      article.type === "Article" &&
      selectedArticles.filter((a) => a.type === "Article").length <
        targetArticleCount &&
      !seenSources.has(article.source_name)
    ) {
      selectedArticles.push(article);
      seenSources.add(article.source_name);
    }
  }

  // Second pass: add one video if available
  for (const article of articles) {
    if (article.type === "Video" && !videoAdded) {
      selectedArticles.push(article);
      videoAdded = true;
      break;
    }
  }

  // If we don't have enough articles, fill with remaining articles
  if (
    selectedArticles.filter((a) => a.type === "Article").length <
    targetArticleCount
  ) {
    for (const article of articles) {
      if (
        article.type === "Article" &&
        selectedArticles.filter((a) => a.type === "Article").length <
          targetArticleCount &&
        !selectedArticles.includes(article)
      ) {
        selectedArticles.push(article);
      }
    }
  }

  return selectedArticles;
}

/**
 * Step 4: Process individual article (scraping + content extraction)
 * Uses Mozilla Readability to extract content from article URLs
 * Handles 403 errors gracefully (firewall blocks) - marks as FatalError to skip retries
 */
export async function processArticle(article: StockNewsArticle) {
  "use step";

  try {
    const processed = await ArticleProcessor.processArticle(article);

    // If processing failed due to 403 (firewall/blocked), mark as FatalError to skip retries
    if (!processed.processingMetadata.success) {
      const error = processed.processingMetadata.error || "";
      if (error.includes("HTTP 403") || error.includes("Forbidden")) {
        throw new FatalError(`Article blocked: ${error}`);
      }
      // For other failures, return the failed result (don't throw) so workflow can continue
      // The ArticleProcessor already handles errors gracefully
    }

    return processed;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : undefined;
    const responseStatus =
      error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "status" in error.response &&
      typeof error.response.status === "number"
        ? error.response.status
        : undefined;

    // Handle 403 errors from axios/fetch directly
    if (
      responseStatus === 403 ||
      errorMessage?.includes("403") ||
      errorMessage?.includes("Forbidden")
    ) {
      throw new FatalError(
        `Article blocked: ${errorMessage || "HTTP 403: Forbidden"}`
      );
    }

    // Re-throw other errors for default retry behavior
    throw error;
  }
}

/**
 * Step 5: Generate event-level AI summary
 * Creates a comprehensive summary from all processed articles
 *
 * Has maxRetries limit to prevent infinite retry loops.
 * After maxRetries are exhausted, the step will fail and the workflow catch block will handle it.
 */
export async function generateEventSummary(
  _eventRecordId: string,
  eventName: string,
  eventText: string | undefined,
  processedArticles: ProcessedArticle[]
) {
  "use step";

  // ArticleSummarizer.summarizeAllArticles() may throw RetryableError for transient errors
  // The step will automatically retry up to maxRetries times
  const eventSummary = await ArticleSummarizer.summarizeAllArticles(
    processedArticles,
    eventName,
    eventText
  );

  return eventSummary;
}

// Set max retries to prevent infinite loops (default is 3)
// After 5 retries (6 total attempts), the step will fail and workflow catch block handles it
generateEventSummary.maxRetries = 5; // 6 total attempts (1 initial + 5 retries)

/**
 * Step 6: Persist all data to database
 * Business logic: build article inserts, delete existing, insert new, update summary
 */
export async function persistEventData(
  eventRecordId: string,
  processedArticles: ProcessedArticle[],
  eventSummary: Awaited<ReturnType<typeof generateEventSummary>>
): Promise<{ articlesSaved: number }> {
  "use step";

  try {
    // Build article inserts (business logic stays in step)
    const articleInserts: EventArticleInsert[] = processedArticles.map(
      (processed) => ({
        date: processed.originalArticle.date
          ? new Date(processed.originalArticle.date)
          : null,
        financialEventId: eventRecordId,
        imageUrl: processed.originalArticle.image_url ?? null,
        newsUrl: processed.originalArticle.news_url ?? "",
        sourceName: processed.originalArticle.source_name ?? null,
        text: processed.originalArticle.title,
        tickers: processed.originalArticle.tickers ?? [],
        title: processed.originalArticle.title,
        topics: processed.originalArticle.topics ?? [],
        type: processed.originalArticle.type ?? "Article",
      })
    );

    // Delete existing articles and insert new ones (primitive operations)
    await deleteArticlesByEventId(eventRecordId);
    await insertEventArticles(articleInserts);

    // Update event with AI-generated summary (primitive operation)
    await updateEventSummary(eventRecordId, {
      eventSummary: eventSummary.eventSummary,
      keyPoints: eventSummary.keyPoints,
      overallSentiment: eventSummary.overallSentiment,
      scrapedArticlesCount: processedArticles.length,
      topics: eventSummary.topics,
    });

    return { articlesSaved: processedArticles.length };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Database connection errors - retryable
    if (
      errorMessage.includes("connection") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT")
    ) {
      throw new RetryableError(`Database connection error: ${errorMessage}`, {
        retryAfter: "5s",
      });
    }

    // Re-throw other errors for default retry behavior
    throw error;
  }
}

// Set max retries to prevent infinite loops
persistEventData.maxRetries = 3; // 4 total attempts
