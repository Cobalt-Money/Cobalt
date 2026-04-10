import type { ChartPeriod } from "@/components/research/lightweight-price-chart";

export interface MockQuote {
  change: number;
  changePercent: number;
  companyName: string;
  currentPrice: number;
}

export function mockQuote(symbol: string): MockQuote {
  const sym = symbol.trim().toUpperCase();
  if (sym === "TSLA") {
    return {
      change: -1.3,
      changePercent: -0.39,
      companyName: "Tesla Inc.",
      currentPrice: 329.22,
    };
  }
  return {
    change: 0.42,
    changePercent: 0.12,
    companyName: `Mock Company (${sym})`,
    currentPrice: 100 + (sym.length % 50) * 2.15,
  };
}

export function mockOverview(symbol: string): Record<string, unknown> {
  const sym = symbol.trim().toUpperCase();
  return {
    Beta: "2.33",
    Description:
      "Placeholder company description for layout and styling. Replace with live overview data when APIs are wired.",
    DividendYield: "0",
    EPS: "2.21",
    EVToRevenue: "10.82",
    MarketCapitalization: "1060000000000",
    Name: sym === "TSLA" ? "Tesla Inc." : `Sample Name ${sym}`,
    PERatio: "149.04",
    ProfitMargin: "0.0901",
    RevenueTTM: "97690000000",
    Sector: "Consumer Cyclical",
  };
}

export function mockNews(symbol: string): Record<string, unknown>[] {
  const sym = symbol.trim().toUpperCase();
  return [
    {
      id: "mock-1",
      title: `${sym}: sample headline for layout (mock data)`,
      url: "https://example.com",
    },
    {
      id: "mock-2",
      title: "Another mock article title to fill the list",
      url: "https://example.com/news",
    },
  ];
}

/** Synthetic series for Lightweight Charts (UI only, UNIX timestamps). */
export function mockChartPoints(
  period: ChartPeriod,
  symbol: string
): { time: number; value: number }[] {
  const sym = symbol.trim().toUpperCase();
  const seed = [...sym].reduce((a, c) => a + (c.codePointAt(0) ?? 0), 0);

  const now = Math.floor(Date.now() / 1000);
  const DAY = 86_400;
  let count: number;
  let stepSeconds: number;

  switch (period) {
    case "1D": {
      count = 78;
      stepSeconds = 300;
      break;
    }
    case "1W": {
      count = 7 * 13;
      stepSeconds = 1800;
      break;
    }
    case "1M": {
      count = 22;
      stepSeconds = DAY;
      break;
    }
    case "3M": {
      count = 65;
      stepSeconds = DAY;
      break;
    }
    case "6M": {
      count = 130;
      stepSeconds = DAY;
      break;
    }
    case "YTD": {
      count = 90;
      stepSeconds = DAY;
      break;
    }
    case "1Y": {
      count = 252;
      stepSeconds = DAY;
      break;
    }
    case "All": {
      count = 500;
      stepSeconds = DAY;
      break;
    }
    default: {
      count = 40;
      stepSeconds = DAY;
    }
  }

  const startTime = now - count * stepSeconds;
  const base = 280 + (seed % 80);

  return Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1);
    const wobble = Math.sin(t * Math.PI * 3 + seed * 0.01) * 12;
    const drift = t * 35;
    const price = base + wobble + drift + (i % 5) * 0.4;
    return {
      time: startTime + i * stepSeconds,
      value: Math.round(price * 100) / 100,
    };
  });
}
