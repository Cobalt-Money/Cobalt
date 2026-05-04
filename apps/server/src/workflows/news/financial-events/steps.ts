import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";
import {
  fetchArticleContent,
  fetchArticlesForEvent,
} from "@cobalt-web/server-data/news/events/actions";
import type { StockNewsEvent } from "@cobalt-web/server-data/news/events/actions";
import {
  selectBestArticles,
  toFailedProcessedArticle,
} from "@cobalt-web/server-data/news/events/lib";
import type { EventSummary, ProcessedArticle } from "@cobalt-web/server-data/news/events/lib";
import {
  applyEventSummary,
  replaceEventArticles,
  upsertFinancialEventHeader,
} from "@cobalt-web/server-data/news/events/mutations";
import { FatalError, getStepMetadata, RetryableError } from "workflow";

import {
  summarizeEventArticles,
  TransientSummaryError,
} from "../../../ai/agents/financial-events-summary/financial-events-summary-agent.js";

// ── Per-event pipeline ────────────────────────────────────────────

export async function upsertEventHeaderStep(event: StockNewsEvent): Promise<string> {
  "use step";

  return await upsertFinancialEventHeader({
    date: event.date ? new Date(event.date) : null,
    eventId: event.event_id,
    eventName: event.event_name,
    eventText: event.event_text,
    newsItems: event.news_items,
    tickers: event.tickers,
  });
}

export async function fetchEventArticlesStep(eventId: string): Promise<StockNewsArticle[]> {
  "use step";

  return await fetchArticlesForEvent(eventId, 20);
}

// Pure helper re-exported for the workflow — deterministic, no step boundary needed.
export function pickArticles(articles: StockNewsArticle[]): StockNewsArticle[] {
  return selectBestArticles(articles, 5);
}

export async function processArticleStep(article: StockNewsArticle): Promise<ProcessedArticle> {
  "use step";

  const result = await fetchArticleContent(article);

  if (!result.processingMetadata.success) {
    const error = result.processingMetadata.error ?? "";
    if (/403|Forbidden/i.test(error)) {
      throw new FatalError(`Article blocked (${error})`);
    }
  }
  return result;
}

export async function summarizeEventStep(
  eventName: string,
  eventText: string | undefined,
  scraped: ProcessedArticle[],
): Promise<EventSummary> {
  "use step";

  try {
    return await summarizeEventArticles(eventName, eventText, scraped);
  } catch (error) {
    if (error instanceof TransientSummaryError) {
      // Exponential backoff for schema / transient failures: 1s, 4s, 9s, 16s, 25s.
      // Gives the model progressively more time between retries in case the
      // structured-output failure was due to transient model flakiness.
      const { attempt } = getStepMetadata();
      throw new RetryableError(error.message, {
        retryAfter: attempt ** 2 * 1000,
      });
    }
    throw error;
  }
}
summarizeEventStep.maxRetries = 5;

export async function persistEventStep(
  eventRecordId: string,
  persisted: ProcessedArticle[],
  summary: EventSummary,
  scrapedArticlesCount: number,
): Promise<void> {
  "use step";

  await replaceEventArticles(eventRecordId, persisted);
  await applyEventSummary(eventRecordId, summary, scrapedArticlesCount);
}

// Re-export for the workflow file so it can build the "failed scrape" placeholders
// without also reaching into server-data.
export { toFailedProcessedArticle };
