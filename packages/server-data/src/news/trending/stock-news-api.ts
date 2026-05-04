import { env } from "@cobalt-web/env/server";

// ── Types ─────────────────────────────────────────────────────────

export interface StockNewsAlert {
  news_url: string;
  title: string;
  source_name: string;
  date: string;
  sentiment: string;
  tickers: string[];
}

export interface StockNewsAlertsResponse {
  data: StockNewsAlert[];
  total_pages: number;
  total_items: number;
}

interface GetAlertsParams {
  category?: string;
  tickers?: string;
  items?: number;
  page?: number;
}

// ── Client ────────────────────────────────────────────────────────

class StockNewsAPI {
  private readonly apiKey: string;
  private readonly baseUrl = "https://stocknewsapi.com/api/v1";

  constructor() {
    this.apiKey = env.STOCK_NEWS_API_KEY;
  }

  async getAlerts(params: GetAlertsParams): Promise<StockNewsAlertsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set("token", this.apiKey);

    if (params.category) {
      searchParams.set("category", params.category);
    }
    if (params.tickers) {
      searchParams.set("tickers", params.tickers);
    }
    if (params.items !== undefined) {
      searchParams.set("items", String(params.items));
    }
    if (params.page !== undefined) {
      searchParams.set("page", String(params.page));
    }

    const url = `${this.baseUrl}/alerts?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Stock News API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as StockNewsAlertsResponse;
  }
}

export const stockNewsAPI = new StockNewsAPI();
