import { formatPublishDate, getCleanSourceName, getNewsSourceLogo } from "../lib.js";
import { withStockNewsUpstream } from "../upstream-errors.js";
import type { TrendingHeadline } from "./schemas.js";
import { stockNewsAPI } from "./stock-news-api.js";

// ── Query ─────────────────────────────────────────────────────────

export const getTrendingHeadlines = async (
  _userId: string,
  userTickers: string[],
  limit: number,
): Promise<TrendingHeadline[]> => {
  const tickerString = userTickers.join(",");

  const response = await withStockNewsUpstream(() =>
    stockNewsAPI.getAlerts({
      category: "ticker",
      items: limit,
      page: 1,
      tickers: tickerString,
    }),
  );

  return response.data.map((article, index) => ({
    id: `trending-${Date.now()}-${index}`,
    imageUrl: "/cobalt-placeholder-64x64.svg",
    link: article.news_url,
    publishedAt: formatPublishDate(new Date(article.date)),
    sentiment: article.sentiment,
    sources: [
      {
        logo: getNewsSourceLogo(article.source_name),
        name: getCleanSourceName(article.source_name),
      },
    ],
    summary: article.title,
    tickers: article.tickers,
    title: article.title,
    type: "grid" as const,
  }));
};
