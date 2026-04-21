import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";
import type { EventArticleInsert } from "@cobalt-web/db/schema/features";

// ---------------------------------------------------------------------------
// Domain types — shared across actions + workflow steps
// ---------------------------------------------------------------------------

export const TOPIC_CATEGORIES = [
  "tech",
  "government",
  "analyst",
  "AI",
  "announcement",
  "leadership",
  "energy",
  "earnings",
  "other",
] as const;

export type TopicCategory = (typeof TOPIC_CATEGORIES)[number];

export interface ProcessedArticle {
  originalArticle: StockNewsArticle;
  extractedContent: {
    title: string;
    text: string;
    author?: string;
    image?: string;
    siteName?: string;
    publishedTime?: string;
    excerpt?: string;
  };
  processingMetadata: {
    processedAt: Date;
    success: boolean;
    error?: string;
    contentLength: number;
    extractionTime: number;
  };
}

export interface EventSummary {
  eventSummary: string;
  keyPoints: string[];
  overallSentiment: "positive" | "negative" | "neutral";
  topics: TopicCategory[];
  articleCount: number;
  processingMetadata: {
    summarizedAt: Date;
    success: boolean;
    error?: string;
    processingTime: number;
    model: string;
  };
}

// ---------------------------------------------------------------------------
// Article selection — unique-source dedup, prefer articles, include one video
// ---------------------------------------------------------------------------

export function selectBestArticles(
  articles: StockNewsArticle[],
  limit = 5
): StockNewsArticle[] {
  const selected: StockNewsArticle[] = [];
  const seenSources = new Set<string>();

  for (const article of articles) {
    if (article.type !== "Article") {
      continue;
    }
    if (selected.filter((a) => a.type === "Article").length >= limit) {
      break;
    }
    if (!seenSources.has(article.source_name)) {
      selected.push(article);
      seenSources.add(article.source_name);
    }
  }

  for (const article of articles) {
    if (article.type === "Video") {
      selected.push(article);
      break;
    }
  }

  if (selected.filter((a) => a.type === "Article").length < limit) {
    for (const article of articles) {
      if (article.type !== "Article") {
        continue;
      }
      if (selected.filter((a) => a.type === "Article").length >= limit) {
        break;
      }
      if (!selected.includes(article)) {
        selected.push(article);
      }
    }
  }

  return selected;
}

// Maps a ProcessedArticle onto the DB row shape for the `event_articles` table.
// Lives in lib so it can be unit-tested without any DB runtime — the mutation
// layer calls this before handing the row off to `db.insert().values()`.
export function toEventArticleInsertRow(
  eventRecordId: string,
  processed: ProcessedArticle
): EventArticleInsert {
  const original = processed.originalArticle;
  return {
    date: original.date ? new Date(original.date) : null,
    financialEventId: eventRecordId,
    imageUrl: original.image_url ?? null,
    newsUrl: original.news_url,
    sourceName: original.source_name ?? null,
    text: original.title,
    tickers: original.tickers ?? null,
    title: original.title,
    topics: original.topics ?? null,
    type: original.type ?? null,
  };
}

export function toFailedProcessedArticle(
  article: StockNewsArticle,
  error: string
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
      extractionTime: 0,
      processedAt: new Date(),
      success: false,
    },
  };
}
