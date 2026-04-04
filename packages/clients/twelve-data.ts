import { env } from "@cobalt-web/env/server";

const BASE_URL = "https://api.twelvedata.com";

export interface TwelveDataTicker {
  symbol: string;
  name: string;
  currency: string;
  exchange: string;
  mic_code: string;
  country: string;
  type: string;
}

interface TwelveDataStocksResponse {
  data: TwelveDataTicker[];
  status: string;
}

/**
 * Fetches all tickers from Twelve Data API for the given exchanges.
 * Returns deduplicated results (first occurrence wins).
 */
export async function getAllTickers(
  exchanges: string[] = ["NASDAQ", "NYSE"]
): Promise<TwelveDataTicker[]> {
  const results: TwelveDataTicker[] = [];

  for (const exchange of exchanges) {
    const url = new URL(`${BASE_URL}/stocks`);
    url.searchParams.set("apikey", env.TWELVE_DATA_API_KEY);
    url.searchParams.set("exchange", exchange);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        `Twelve Data API error: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as TwelveDataStocksResponse;

    if (data.status !== "ok") {
      throw new Error(`Twelve Data API returned status: ${data.status}`);
    }

    results.push(...(data.data ?? []));
  }

  // Deduplicate by symbol
  const seen = new Set<string>();
  return results.filter((t) => {
    if (seen.has(t.symbol)) {
      return false;
    }
    seen.add(t.symbol);
    return true;
  });
}
