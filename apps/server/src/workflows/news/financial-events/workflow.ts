import type { StockNewsEvent } from "@cobalt-web/server-data/news/events/actions";
import type { EventSummary, ProcessedArticle } from "@cobalt-web/server-data/news/events/lib";

import { captureWorkflowExceptionStep, toSerializableError } from "../../shared/steps.js";
import {
  fetchEventArticlesStep,
  persistEventStep,
  pickArticles,
  processArticleStep,
  summarizeEventStep,
  toFailedProcessedArticle,
  upsertEventHeaderStep,
} from "./steps.js";

export interface ProcessFinancialEventResult {
  success: boolean;
  eventId: string;
  articlesPersisted: number;
  articlesScraped: number;
  error?: string;
}

function emptyScrapeSummary(eventText: string | undefined): EventSummary {
  return {
    articleCount: 0,
    eventSummary: eventText ?? "No article content could be extracted for this event.",
    keyPoints: [],
    overallSentiment: "neutral",
    processingMetadata: {
      error: "No articles to summarize",
      model: "N/A",
      processingTime: 0,
      success: false,
      summarizedAt: new Date(),
    },
    topics: ["other"],
  };
}

export async function processFinancialEventWorkflow(
  event: StockNewsEvent,
): Promise<ProcessFinancialEventResult> {
  "use workflow";

  try {
    const eventRecordId = await upsertEventHeaderStep(event);
    const rawArticles = await fetchEventArticlesStep(event.event_id);
    const selected = pickArticles(rawArticles);

    const results = await Promise.allSettled(selected.map((a) => processArticleStep(a)));

    const scraped: ProcessedArticle[] = [];
    const persistable: ProcessedArticle[] = [];

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        scraped.push(result.value);
        persistable.push(result.value);
        continue;
      }
      const source = selected[index];
      if (!source) {
        continue;
      }
      const errorMessage = result.reason instanceof Error ? result.reason.message : "Unknown error";
      persistable.push(toFailedProcessedArticle(source, errorMessage));
    }

    const summary: EventSummary =
      scraped.length === 0
        ? emptyScrapeSummary(event.event_text)
        : await summarizeEventStep(event.event_name, event.event_text, scraped);

    await persistEventStep(eventRecordId, persistable, summary, scraped.length);

    const success = scraped.length > 0 || summary.processingMetadata.success;

    return {
      articlesPersisted: persistable.length,
      articlesScraped: scraped.length,
      eventId: event.event_id,
      success,
    };
  } catch (error) {
    await captureWorkflowExceptionStep("news_financial_events", toSerializableError(error), {
      eventId: event.event_id,
      eventName: event.event_name,
    });
    return {
      articlesPersisted: 0,
      articlesScraped: 0,
      error: error instanceof Error ? error.message : String(error),
      eventId: event.event_id,
      success: false,
    };
  }
}
