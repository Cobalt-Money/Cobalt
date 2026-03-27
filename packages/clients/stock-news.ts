import { env } from "@cobalt-web/env/server";

const BASE_URL = "https://stocknewsapi.com/api/v1";

async function stockNewsRequest<T>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("token", env.STOCK_NEWS_API_KEY);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "Cobalt-Financial-News/1.0",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `Stock News API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export interface StockNewsArticle {
  title: string;
  news_url: string;
  image_url?: string;
  text: string;
  sentiment: string;
  type: string;
  source_name: string;
  date: string;
  tickers: string[];
  topics: string[];
}

export interface StockNewsTickerArticlesResponse {
  data: StockNewsArticle[];
  total_pages: number;
  total_items: number;
}

export function getTickerNews(params: {
  tickers: string;
  items?: number;
  sourceexclude?: string;
  type?: string;
}): Promise<StockNewsTickerArticlesResponse> {
  const queryParams: Record<string, string> = {
    tickers: params.tickers,
  };
  if (params.items) {
    queryParams.items = params.items.toString();
  }
  if (params.sourceexclude) {
    queryParams.sourceexclude = params.sourceexclude;
  }
  if (params.type) {
    queryParams.type = params.type;
  }

  return stockNewsRequest<StockNewsTickerArticlesResponse>("", queryParams);
}
