import type { EventArticle, FinancialEvent } from "@cobalt-web/db/schema/news";

import type { MappedFinancialEvent } from "./events/schemas.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FinancialEventWithArticles extends FinancialEvent {
  articles: EventArticle[];
}

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

interface GeneralEventsCursor {
  date: string;
  id: string;
}

interface ForYouEventsCursor {
  createdAt: string;
  id: string;
}

export const encodeCursor = (date: Date | null, id: string): string => {
  const cursor: GeneralEventsCursor = {
    date: date?.toISOString() ?? "",
    id,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
};

export const decodeCursor = (cursor: string): GeneralEventsCursor | null => {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8")
    ) as GeneralEventsCursor;

    if (!decoded.id || typeof decoded.id !== "string") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

export const encodeCursorForYou = (createdAt: Date, id: string): string => {
  const cursor: ForYouEventsCursor = {
    createdAt: createdAt.toISOString(),
    id,
  };
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
};

export const decodeCursorForYou = (
  cursor: string
): ForYouEventsCursor | null => {
  try {
    const decoded = JSON.parse(
      Buffer.from(cursor, "base64").toString("utf-8")
    ) as ForYouEventsCursor;

    if (!decoded.id || typeof decoded.id !== "string") {
      return null;
    }
    if (!decoded.createdAt || typeof decoded.createdAt !== "string") {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// News source logos
// ---------------------------------------------------------------------------

export const NEWS_SOURCE_LOGOS: Record<string, string> = {
  "24/7 Wall Street": "/papers/24-7-wall-street.png",
  Accesswire: "/papers/accesswire.png",
  "After Earnings (video)": "/papers/after-earnings.png",
  Barrons: "/papers/barrons.png",
  Benzinga: "/papers/benzinga.png",
  Bloomberg: "/papers/bloomberg.png",
  "Bloomberg Markets and Finance (video)": "/papers/bloomberg.png",
  "Bloomberg Technology (video)": "/papers/bloomberg.png",
  "Business Insider": "/papers/business-insider.png",
  "Business Wire": "/papers/business-wire.png",
  CNBC: "/papers/cnbc.png",
  "CNBC International TV": "/papers/cnbc.png",
  "CNBC Television": "/papers/cnbc.png",
  CNET: "/papers/cnet.png",
  CNN: "/papers/cnn.png",
  "CNN Business": "/papers/cnn.png",
  "Cheddar Videos": "/papers/cheddar.png",
  Deadline: "/papers/deadline.png",
  "Digital Trends (video)": "/papers/digital-trends.png",
  "Discount The Obvious": "/papers/discount-the-obvious.png",
  "ETF Trends": "/papers/etf-trends.png",
  "ETF.com": "/papers/etf-com.png",
  "Engadget (video)": "/papers/engadget.png",
  FXEmpire: "/papers/fxempire.png",
  "Fast Company": "/papers/fast-company.png",
  Finbold: "/papers/finbold.png",
  Forbes: "/papers/forbes.png",
  "Fox Business": "/papers/fox-business.png",
  FreightWaves: "/papers/freightwaves.png",
  GeekWire: "/papers/geekwire.png",
  GlobeNewsWire: "/papers/globe-news-wire.png",
  "Green Stock News (video)": "/papers/green-stock-news.png",
  GuruFocus: "/papers/gurufocus.png",
  "Huffington Post": "/papers/huffington-post.png",
  InsiderTrades: "/papers/insidertrades.png",
  Investopedia: "/papers/investopedia.png",
  "Investor Place": "/papers/investor-place.png",
  "Investors Business Daily": "/papers/investors-business-daily.png",
  Invezz: "/papers/invezz.png",
  Kiplinger: "/papers/kiplinger.png",
  Kitco: "/papers/kitco.png",
  "MCAP MediaWire": "/papers/mcap-mediawire.png",
  "Marijuana Stocks": "/papers/marijuana-stocks.png",
  "Market Watch": "/papers/market-watch.png",
  MarketBeat: "/papers/marketbeat.png",
  "Mcap MediaWire": "/papers/mcap-mediawire.png",
  "Millennial Money": "/papers/millennial-money.png",
  "Morningstar Inc.": "/papers/morningstar.png",
  NYTimes: "/papers/new-york-times.png",
  "New York Post": "/papers/new-york-post.png",
  "Newsfile Corp": "/papers/newsfile-corp.png",
  PRNewswire: "/papers/pr-newswire.png",
  PYMNTS: "/papers/pymnts.png",
  "Penny Stocks": "/papers/penny-stocks.png",
  "Proactive Investors": "/papers/proactive-investors.png",
  Pulse2: "/papers/pulse2.png",
  Reuters: "/papers/reuters.png",
  "Schaeffers Research": "/papers/schaeffers-research.png",
  "Schwab Network": "/papers/schwab-network.png",
  "See It Market": "/papers/see-it-market.png",
  "Seeking Alpha": "/papers/seeking-alpha.png",
  Skynews: "/papers/skynews.png",
  "Stock Market.com": "/papers/stock-market-com.png",
  TechCrunch: "/papers/techcrunch.png",
  TechXplore: "/papers/techxplore.png",
  "The Dog of Wall Street": "/papers/the-dog-of-wall-street.png",
  "The Financial News": "/papers/the-financial-news.png",
  "The Guardian": "/papers/the-guardian.png",
  "The Motley Fool": "/papers/the-motley-fool.png",
  "The Street (video)": "/papers/the-street.png",
  "The Verge (video)": "/papers/the-verge.png",
  VentureBeat: "/papers/venturebeat.png",
  WSJ: "/papers/wall-street-journal.png",
  "Wall+Street+Journal": "/papers/wall-street-journal.png",
  "Yahoo Finance": "/papers/yahoo-finance.png",
  "Zacks Investment Research": "/papers/zacks-investment-research.png",
};

// ---------------------------------------------------------------------------
// Source helpers
// ---------------------------------------------------------------------------

export const getNewsSourceLogo = (sourceName: string): string => {
  const exact = NEWS_SOURCE_LOGOS[sourceName];
  if (exact) {
    return exact;
  }

  const lower = sourceName.toLowerCase();
  for (const [key, logo] of Object.entries(NEWS_SOURCE_LOGOS)) {
    if (lower.includes(key.toLowerCase())) {
      return logo;
    }
  }

  return sourceName.slice(0, 2).toUpperCase();
};

export const getCleanSourceName = (sourceName: string): string => {
  if (!sourceName) {
    return "Unknown Source";
  }
  return sourceName
    .replace(/\s*\(video\)$/i, "")
    .replace(/\s*\(articles\)$/i, "")
    .trim();
};

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export const formatPublishDate = (date: Date | null): string => {
  if (!date) {
    return "Unknown date";
  }

  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return "Just now";
  }
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString();
};

// ---------------------------------------------------------------------------
// Article helpers
// ---------------------------------------------------------------------------

export const getImageUrl = (
  articles: { imageUrl: string | null; type: string | null }[]
): string => {
  const regularWithImage = articles.find(
    (article) =>
      article.imageUrl?.startsWith("http") && article.type !== "Video"
  );
  if (regularWithImage?.imageUrl) {
    return regularWithImage.imageUrl;
  }

  const anyWithImage = articles.find((article) =>
    article.imageUrl?.startsWith("http")
  );
  if (anyWithImage?.imageUrl) {
    return anyWithImage.imageUrl;
  }

  return "/cobalt3.png";
};

export const getAllSources = (
  articles: { sourceName: string | null }[]
): { name: string; logo: string }[] => {
  if (articles.length === 0) {
    return [{ logo: "FN", name: "Financial News" }];
  }

  const uniqueSources = new Set<string>();
  for (const article of articles) {
    if (article.sourceName) {
      uniqueSources.add(article.sourceName);
    }
  }

  return [...uniqueSources].map((sourceName) => ({
    logo: getNewsSourceLogo(sourceName),
    name: getCleanSourceName(sourceName),
  }));
};

// ---------------------------------------------------------------------------
// Transformers
// ---------------------------------------------------------------------------

export const transformFinancialEventsForUI = (
  events: FinancialEventWithArticles[]
): MappedFinancialEvent[] =>
  events.map((event) => ({
    id: event.id,
    imageUrl: getImageUrl(event.articles),
    link: `/news/${event.id}`,
    publishedAt: formatPublishDate(event.date ?? event.createdAt),
    sources: getAllSources(event.articles),
    summary: event.eventText ?? "No description available",
    tickers: event.tickers ? (event.tickers as string[]) : undefined,
    title: event.eventName,
    topics: event.topics ? (event.topics as string[]) : undefined,
    type: "featured" as const,
  }));
