import { stockNewsRequest } from "@cobalt-web/clients/stock-news";
import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";

// ── Research news ──────────────────────────────────────────────────

interface StockNewsTickerArticlesResponse {
  data: StockNewsArticle[];
  total_pages: number;
  total_items: number;
}

export function getResearchNews(
  symbol: string
): Promise<StockNewsTickerArticlesResponse> {
  return stockNewsRequest<StockNewsTickerArticlesResponse>("", {
    items: "50",
    sourceexclude: "Benzinga,The Motley Fool,Zacks Investment Research",
    tickers: symbol,
    type: "Article",
  });
}
