import type {
  FinancialEventArticlePreview,
  FinancialEventCard,
} from "@cobalt-web/ui/cobalt/news/financial-events-feed";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

function parseTickers(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) {
      out.push(x.trim());
    }
  }
  return out;
}

function parseTopics(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) {
      out.push(x.trim());
    }
  }
  return out;
}

function optStr(o: Record<string, unknown>, key: string): string | null {
  const v = o[key];
  if (v === undefined || v === null) {
    return null;
  }
  return String(v);
}

function mapArticle(a: unknown): FinancialEventArticlePreview | null {
  if (typeof a !== "object" || a === null) {
    return null;
  }
  const o = a as Record<string, unknown>;
  const id = optStr(o, "id") ?? "";
  const title = optStr(o, "title") ?? "";
  const newsUrl = optStr(o, "newsUrl") ?? "";
  if (!id || !title || !newsUrl) {
    return null;
  }
  return {
    id,
    imageUrl: optStr(o, "imageUrl"),
    newsUrl,
    sourceName: optStr(o, "sourceName"),
    title,
  };
}

function mapArticles(raw: unknown): FinancialEventArticlePreview[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: FinancialEventArticlePreview[] = [];
  for (const a of raw) {
    const m = mapArticle(a);
    if (m) {
      out.push(m);
    }
  }
  return out;
}

function toFinancialEventCard(row: unknown): FinancialEventCard | null {
  if (typeof row !== "object" || row === null) {
    return null;
  }
  const o = row as Record<string, unknown>;
  const id = optStr(o, "id") ?? "";
  const eventName = optStr(o, "eventName") ?? "";
  if (!id || !eventName) {
    return null;
  }
  return {
    articles: mapArticles(o.articles),
    createdAt: typeof o.createdAt === "number" ? o.createdAt : null,
    date: typeof o.date === "number" ? o.date : null,
    eventId: optStr(o, "eventId") ?? "",
    eventName,
    eventText: optStr(o, "eventText"),
    id,
    newsItems: typeof o.newsItems === "number" ? o.newsItems : 0,
    sentiment: optStr(o, "sentiment"),
    summary: optStr(o, "summary"),
    tickers: parseTickers(o.tickers),
    topics: parseTopics(o.topics),
  };
}

/** Subscribes to financial events + related articles for `/news` (Zero `financial_events`). */
export function useFinancialEvents() {
  const [rows] = useQuery(queries.news.events());
  const events = useMemo(() => {
    const out: FinancialEventCard[] = [];
    for (const r of rows) {
      const card = toFinancialEventCard(r);
      if (card) {
        out.push(card);
      }
    }
    return out;
  }, [rows]);
  return { events };
}
