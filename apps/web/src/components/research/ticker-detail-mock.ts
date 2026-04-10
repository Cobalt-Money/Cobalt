import type { ChartPeriod } from "@/components/research/ticker-detail-sections";

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

/** Synthetic OHLC-style series for the chart (UI only). */
export function mockChartPoints(
  period: ChartPeriod,
  symbol: string
): { i: number; label: string; price: number; volume: number }[] {
  const sym = symbol.trim().toUpperCase();
  const seed = [...sym].reduce((a, c) => a + (c.codePointAt(0) ?? 0), 0);
  let count = 40;
  if (period === "1D") {
    count = 48;
  } else if (period === "1W") {
    count = 42;
  } else if (period === "1M" || period === "3M") {
    count = 45;
  }
  const base = 280 + (seed % 80);
  return Array.from({ length: count }, (_, i) => {
    const t = i / Math.max(1, count - 1);
    const wobble = Math.sin(t * Math.PI * 3 + seed * 0.01) * 12;
    const drift = t * 35;
    const price = base + wobble + drift + (i % 5) * 0.4;
    return {
      i,
      label: `T${i}`,
      price: Math.round(price * 100) / 100,
      volume: 1_000_000 + ((i * 17_000) % 5_000_000),
    };
  });
}
