import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(import("@cobalt-web/auth"), () => ({
  auth: {
    api: {
      getSession: vi.fn(() =>
        Promise.resolve({
          session: { id: "sess-1" },
          user: { email: "u@test", id: "user-1" },
        }),
      ),
    },
  } as never,
}));

vi.mock(import("@cobalt-web/server-data/subscriptions"), () => ({
  userHasActiveSubscription: vi.fn(() => Promise.resolve(true)),
}));

vi.mock(import("@cobalt-web/server-data/research/fmp-ticker"), () => ({
  fmpGetChart: vi.fn(),
  fmpGetProfile: vi.fn(),
  fmpGetQuote: vi.fn(),
}));

vi.mock(import("@cobalt-web/server-data/research/queries"), () => ({
  getResearchNews: vi.fn(),
}));

vi.mock(import("@cobalt-web/server-data/research/fmp-screener"), () => ({
  DEFAULT_COMPANY_SCREENER: {},
  fmpCompanyScreenerNasdaqNyse: vi.fn(),
}));

vi.mock(import("@cobalt-web/server-data/research/fmp-screener-metrics"), () => ({
  enrichScreenerRowsWithRevenueAndRating: vi.fn((rows: Record<string, unknown>[]) =>
    Promise.resolve(rows),
  ),
}));

vi.mock(import("@cobalt-web/server-data/research/screener-query"), () => ({
  screenerQueryToCompanyParams: vi.fn(() => ({})),
}));

const { fmpGetChart, fmpGetProfile, fmpGetQuote } =
  await import("@cobalt-web/server-data/research/fmp-ticker");
const { getResearchNews } = await import("@cobalt-web/server-data/research/queries");
const { fmpCompanyScreenerNasdaqNyse } =
  await import("@cobalt-web/server-data/research/fmp-screener");

const { quoteRouter } = await import("./quote.js");
const { overviewRouter } = await import("./overview.js");
const { chartRouter } = await import("./chart.js");
const { newsRouter } = await import("./news.js");
const { screenerRouter } = await import("./screener.js");

const mockQuote = vi.mocked(fmpGetQuote);
const mockProfile = vi.mocked(fmpGetProfile);
const mockChart = vi.mocked(fmpGetChart);
const mockNews = vi.mocked(getResearchNews);
const mockScreener = vi.mocked(fmpCompanyScreenerNasdaqNyse);

describe("research routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("research /quote", () => {
    it("returns FMP quote payload", async () => {
      mockQuote.mockResolvedValue({
        change: 1.5,
        changePercent: 0.7,
        companyName: "Apple Inc.",
        currentPrice: 200,
      });
      const res = await quoteRouter.request("/quote?symbol=AAPL");
      expect(res.status).toBe(200);
      expect(mockQuote).toHaveBeenCalledWith("AAPL");
      expect(res.headers.get("cache-control")).toContain("s-maxage=900");
      await expect(res.json()).resolves.toStrictEqual({
        change: 1.5,
        changePercent: 0.7,
        companyName: "Apple Inc.",
        currentPrice: 200,
      });
    });

    it("returns 500 when FMP throws", async () => {
      mockQuote.mockRejectedValue(new Error("upstream"));
      const res = await quoteRouter.request("/quote?symbol=AAPL");
      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toStrictEqual({
        error: "Internal server error",
      });
    });

    it("422s on missing symbol", async () => {
      const res = await quoteRouter.request("/quote");
      expect(res.status).toBe(422);
      expect(mockQuote).not.toHaveBeenCalled();
    });
  });

  describe("research /overview", () => {
    it("returns FMP profile payload", async () => {
      const profile = {
        beta: 1.2,
        ceo: "Tim Cook",
        companyName: "Apple Inc.",
        country: "US",
        currency: "USD",
        description: "iPhones",
        dividendYield: null,
        exchange: "NASDAQ",
        fullTimeEmployees: 150_000,
        industry: "Consumer Electronics",
        ipoDate: "1980-12-12",
        marketCap: 3_000_000_000,
        pe: 30,
        price: 200,
        revenue: 400_000_000,
        sector: "Tech",
        symbol: "AAPL",
        website: "https://apple.com",
      };
      mockProfile.mockResolvedValue(profile);
      const res = await overviewRouter.request("/overview?symbol=AAPL");
      expect(res.status).toBe(200);
      expect(mockProfile).toHaveBeenCalledWith("AAPL");
      await expect(res.json()).resolves.toStrictEqual(profile);
    });

    it("returns 500 on upstream failure", async () => {
      mockProfile.mockRejectedValue(new Error("nope"));
      const res = await overviewRouter.request("/overview?symbol=AAPL");
      expect(res.status).toBe(500);
    });
  });

  describe("research /chart", () => {
    it("maps FMP historical points + sets cache header", async () => {
      mockChart.mockResolvedValue([
        {
          close: 100,
          date: "2026-04-01",
          high: 101,
          low: 99,
          open: 99.5,
          volume: 1000,
        },
        {
          close: 102,
          date: "2026-04-02",
          high: 103,
          low: 100,
          open: 100,
          volume: 2000,
        },
      ]);
      const res = await chartRouter.request("/chart?symbol=AAPL&timePeriod=1M");
      expect(res.status).toBe(200);
      expect(mockChart).toHaveBeenCalledWith("AAPL", "1M");
      const body = (await res.json()) as {
        data: Record<string, unknown>[];
      };
      expect(body.data).toHaveLength(2);
      expect(body.data[0]).toMatchObject({
        close: 100,
        id: "2026-04-01",
        price: 100,
        time: "2026-04-01",
      });
      expect(res.headers.get("cache-control")).toContain("s-maxage=86400");
    });

    it("uses short cache for intraday periods", async () => {
      mockChart.mockResolvedValue([]);
      const res = await chartRouter.request("/chart?symbol=AAPL&timePeriod=1D");
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toContain("s-maxage=900");
    });

    it("defaults to 1M when timePeriod omitted", async () => {
      mockChart.mockResolvedValue([]);
      await chartRouter.request("/chart?symbol=AAPL");
      expect(mockChart).toHaveBeenCalledWith("AAPL", "1M");
    });
  });

  describe("research /news", () => {
    it("returns StockNews payload", async () => {
      const payload = {
        data: [{ title: "Apple ships M5" }],
        total_items: 1,
        total_pages: 1,
      };
      mockNews.mockResolvedValue(payload as never);
      const res = await newsRouter.request("/news?symbol=AAPL");
      expect(res.status).toBe(200);
      expect(mockNews).toHaveBeenCalledWith("AAPL");
      await expect(res.json()).resolves.toStrictEqual(payload);
    });

    it("returns 500 on upstream failure", async () => {
      mockNews.mockRejectedValue(new Error("nope"));
      const res = await newsRouter.request("/news?symbol=AAPL");
      expect(res.status).toBe(500);
    });
  });

  describe("research /screener", () => {
    it("returns enriched FMP screener rows", async () => {
      mockScreener.mockResolvedValue([
        { companyName: "Apple", symbol: "AAPL" },
        { companyName: "Microsoft", symbol: "MSFT" },
      ] as never);
      const res = await screenerRouter.request("/screener?limit=2");
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toStrictEqual({
        count: 2,
        results: [
          { companyName: "Apple", symbol: "AAPL" },
          { companyName: "Microsoft", symbol: "MSFT" },
        ],
      });
    });

    it("returns 502 when FMP_API_KEY missing", async () => {
      const { ApiError } = await import("@cobalt-web/server-data/_shared/api-error");
      mockScreener.mockRejectedValue(
        new ApiError(502, "fmp_upstream_failed", "FMP_API_KEY not set"),
      );
      const res = await screenerRouter.request("/screener");
      expect(res.status).toBe(502);
    });
  });
});
