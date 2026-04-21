import { env } from "@cobalt-web/env/server";

const BASE_URL = "https://stocknewsapi.com/api/v1";

/**
 * GET `https://stocknewsapi.com/api/v1{endpoint}` with the `token` query param
 * baked in. Callers pass endpoint-specific params + the expected response type.
 * Mirrors the shape of `fmpStableGet`.
 */
export async function stockNewsRequest<T>(
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

// Shared payload shape — every Stock News endpoint that returns article rows
// produces this. Kept at the transport layer because multiple domains consume it.
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
