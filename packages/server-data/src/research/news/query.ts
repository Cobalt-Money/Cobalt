import { stockNewsRequest } from "@cobalt-web/clients/stock-news";
import type { StockNewsArticle } from "@cobalt-web/clients/stock-news";

import { withStockNewsUpstream } from "../../news/upstream-errors.js";

interface StockNewsTickerArticlesResponse {
  data: StockNewsArticle[];
  total_pages: number;
  total_items: number;
}

export function getResearchNews(symbol: string): Promise<StockNewsTickerArticlesResponse> {
  return withStockNewsUpstream(() =>
    stockNewsRequest<StockNewsTickerArticlesResponse>("", {
      items: "50",
      sourceexclude: "Benzinga,The Motley Fool,Zacks Investment Research",
      tickers: symbol,
      type: "Article",
    }),
  );
}
