import type {
  StockNewsEvent,
  StockNewsArticle,
} from "@cobalt-web/clients/stock-news";
import type { ProcessedArticle } from "@cobalt-web/server-data/news/article-processor";

import {
  ensureEventRecord,
  fetchEventArticles,
  selectBestArticles,
  processArticle,
  generateEventSummary,
  persistEventData,
} from "./steps";

export interface ProcessFinancialEventWorkflowResult {
  success: boolean;
  message: string;
  eventId?: string;
  articlesProcessed?: number;
  error?: string;
}

/**
 * Main workflow for processing a single financial event
 * Orchestrates all steps: record creation, article fetching, processing, summarization, and persistence
 */
export async function processFinancialEventWorkflow(
  event: StockNewsEvent
): Promise<ProcessFinancialEventWorkflowResult> {
  "use workflow";

  try {
    // Step 1: Ensure database record
    const { eventRecordId } = await ensureEventRecord(event);

    // Step 2: Fetch articles from external API
    const rawArticles = await fetchEventArticles(event.event_id);

    // Step 3: Select best articles
    const selectedArticles = await selectBestArticles(rawArticles, 5);

    // Step 4: Process each article (parallel within step)
    // Use allSettled to handle individual failures gracefully
    const articleResults = await Promise.allSettled(
      selectedArticles.map((article) => processArticle(article))
    );

    // Filter successful results and log failures
    // Successfully scraped articles (used for AI summary generation)
    const scrapedArticles: ProcessedArticle[] = [];
    // All articles to persist (including failed scrapes — we keep their metadata for images/sources)
    const allArticlesToPersist: ProcessedArticle[] = [];
    const failedArticles: { article: StockNewsArticle; error: string }[] = [];

    for (const [index, result] of articleResults.entries()) {
      if (result.status === "fulfilled") {
        scrapedArticles.push(result.value);
        allArticlesToPersist.push(result.value);
      } else {
        const article = selectedArticles[index];
        if (!article) {
          continue;
        }
        const errorMessage = result.reason?.message || "Unknown error";
        failedArticles.push({ article, error: errorMessage });

        // Still preserve the article metadata (image_url, source_name, title, etc.)
        // so we don't lose sources and images even when scraping fails
        allArticlesToPersist.push({
          extractedContent: {
            text: "",
            title: article.title,
          },
          originalArticle: article,
          processingMetadata: {
            contentLength: 0,
            error: errorMessage,
            extractionTime: 0,
            processedAt: new Date(),
            success: false,
          },
        });
      }
    }

    // Log summary of processing results

    // Generate AI summary from successfully scraped articles only
    // If no articles were scraped, we still persist all article metadata but skip AI summary
    if (scrapedArticles.length === 0) {
      // Create a minimal event summary for persistence
      const minimalSummary = {
        articleCount: 0,
        eventSummary:
          event.event_text ||
          `No article content could be extracted for this event.`,
        keyPoints: [],
        overallSentiment: "neutral" as const,
        processingMetadata: {
          error: "No articles to summarize",
          model: "N/A",
          processingTime: 0,
          success: false,
          summarizedAt: new Date(),
        },
        topics: ["other"] as (
          | "other"
          | "tech"
          | "government"
          | "analyst"
          | "AI"
          | "announcement"
          | "leadership"
          | "energy"
          | "earnings"
        )[],
      };

      // Persist event with ALL article metadata (images + sources preserved)
      await persistEventData(
        eventRecordId,
        allArticlesToPersist,
        minimalSummary
      );

      return {
        articlesProcessed: allArticlesToPersist.length,
        eventId: event.event_id,
        message: `Event record created with ${allArticlesToPersist.length} article sources but no scraped content: ${event.event_name}`,
        success: true,
      };
    }

    // Step 5: Generate event summary (uses only successfully scraped articles for content)
    // Note: Schema validation errors and other transient errors will be automatically
    // retried by Workflow DevKit via RetryableError. If retries are exhausted,
    // the error will be caught by the catch block below.
    const eventSummary = await generateEventSummary(
      eventRecordId,
      event.event_name,
      event.event_text,
      scrapedArticles
    );

    // Step 6: Persist ALL articles (including failed scrapes) so images and sources are preserved
    await persistEventData(eventRecordId, allArticlesToPersist, eventSummary);

    // Consider it successful if we scraped at least one article OR generated a summary
    const isSuccess =
      scrapedArticles.length > 0 || eventSummary.processingMetadata.success;

    return {
      articlesProcessed: allArticlesToPersist.length,
      eventId: event.event_id,
      message: `Processed event: ${event.event_name} (${scrapedArticles.length} scraped, ${allArticlesToPersist.length} total, ${failedArticles.length} failed)`,
      success: isSuccess,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    // Convert error to serializable format - FatalError/RetryableError cannot be serialized by devalue

    return {
      error: errorMessage,
      message: `Failed to process event: ${event.event_name}`,
      success: false,
    };
  }
}
