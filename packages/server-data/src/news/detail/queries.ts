import { db } from "@cobalt-web/db";

import type {
  DetailedFinancialEvent,
  EventArticleDTO,
  EventVideoDTO,
} from "./schemas.js";

// ── Helpers ────────────────────────────────────────────────────────

const VIDEO_URL_PATTERNS = ["youtube.com", "youtu.be", "vimeo.com"];

const isVideo = (article: { type: string | null; newsUrl: string }): boolean =>
  (article.type?.toLowerCase().includes("video") ?? false) ||
  VIDEO_URL_PATTERNS.some((pattern) =>
    article.newsUrl.toLowerCase().includes(pattern)
  );

const toISOStringOrNull = (val: Date | null): string | null =>
  val ? val.toISOString() : null;

const getAllSources = (
  articles: { sourceName: string | null }[]
): { logo: string; name: string }[] => {
  const seen = new Set<string>();
  const sources: { logo: string; name: string }[] = [];

  for (const article of articles) {
    const name = article.sourceName;
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    const domain = `${name.toLowerCase().replaceAll(/[^a-z0-9]/g, "")}.com`;
    sources.push({
      logo: `https://logo.clearbit.com/${domain}`,
      name,
    });
  }

  return sources;
};

// ── Query ──────────────────────────────────────────────────────────

export async function getFinancialEventDetails(
  _userId: string,
  eventId: string
): Promise<DetailedFinancialEvent | null> {
  const row = await db.query.financialEvents.findFirst({
    where: { id: { eq: eventId } },
    with: {
      articles: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!row) {
    return null;
  }

  const allArticles: EventArticleDTO[] = [];
  const videos: EventVideoDTO[] = [];

  for (const article of row.articles) {
    const articleDTO: EventArticleDTO = {
      date: toISOStringOrNull(article.date),
      id: article.id,
      imageUrl: article.imageUrl,
      newsUrl: article.newsUrl,
      sentiment: article.sentiment,
      sourceName: article.sourceName,
      text: article.text,
      tickers: article.tickers as string[] | null,
      title: article.title,
      topics: article.topics as string[] | null,
      type: article.type,
    };

    if (isVideo(article)) {
      videos.push({
        date: articleDTO.date,
        id: article.id,
        imageUrl: article.imageUrl,
        newsUrl: article.newsUrl,
        sourceName: article.sourceName,
        title: article.title,
      });
    } else {
      allArticles.push(articleDTO);
    }
  }

  const sources = getAllSources([
    ...allArticles,
    ...videos.map((v) => ({ sourceName: v.sourceName })),
  ]);

  return {
    articles: allArticles,
    date: toISOStringOrNull(row.date),
    eventId: row.eventId,
    eventName: row.eventName,
    eventText: row.eventText,
    id: row.id,
    keyPoints: row.keyPoints as string[] | null,
    newsItems: row.newsItems,
    sentiment: row.sentiment,
    sources,
    summary: row.summary,
    tickers: row.tickers as string[] | null,
    topics: row.topics as string[] | null,
    videos,
  };
}
