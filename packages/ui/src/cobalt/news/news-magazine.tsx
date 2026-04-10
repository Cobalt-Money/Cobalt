import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { cn, decodeHtmlEntities } from "@cobalt-web/ui/lib/utils";
import { formatDistanceStrict } from "date-fns";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type {
  FinancialEventArticlePreview,
  FinancialEventCard,
} from "./financial-events-feed";

export const NEWS_TAB_DEFS = [
  { id: "general", label: "General" },
  { id: "for-you", label: "For You" },
  { id: "tech", label: "Tech" },
  { id: "government", label: "Government" },
  { id: "ai", label: "AI" },
  { id: "announcement", label: "Announcement" },
  { id: "earnings", label: "Earnings" },
] as const;

export type NewsTab = (typeof NEWS_TAB_DEFS)[number]["id"];

export interface NewsMagazineSidebarItem {
  readonly id: string;
  readonly title: string;
  readonly link: string;
  readonly publishedAt: number | null;
}

export interface NewsMagazineProps {
  readonly eventsGeneral: readonly FinancialEventCard[];
  readonly eventsForYou: readonly FinancialEventCard[];
  readonly rssItems: readonly NewsMagazineSidebarItem[];
  readonly defaultTab?: NewsTab;
  readonly className?: string;
  /**
   * Wrap each event block (featured row or grid card) for client-side navigation,
   * e.g. `<Link to={...}>{inner}</Link>`. Default: render `inner` only.
   */
  readonly renderEventLink?: (
    event: FinancialEventCard,
    inner: ReactNode
  ) => ReactNode;
}

type MagazineSection =
  | { type: "featured"; event: FinancialEventCard; imageRight: boolean }
  | {
      type: "featuredPair";
      first: FinancialEventCard;
      second: FinancialEventCard;
    }
  | { type: "grid"; events: readonly FinancialEventCard[] };

function eventTimestampMs(e: FinancialEventCard): number | null {
  if (e.date !== undefined && e.date !== null) {
    return e.date;
  }
  if (e.createdAt !== undefined && e.createdAt !== null) {
    return e.createdAt;
  }
  return null;
}

function eventMatchesTopicSlug(
  event: FinancialEventCard,
  slug: string
): boolean {
  const normalized = slug.toLowerCase();
  return event.topics.some((t) => t.trim().toLowerCase() === normalized);
}

function compactTimeAgo(ms: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 60) {
    return `${sec}s ago`;
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `${min}m ago`;
  }
  const h = Math.floor(min / 60);
  if (h < 48) {
    return `${h}h ago`;
  }
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function uniqueSourceArticles(
  articles: readonly FinancialEventArticlePreview[],
  max = 6
): FinancialEventArticlePreview[] {
  const seen = new Set<string>();
  const out: FinancialEventArticlePreview[] = [];
  for (const a of articles) {
    const label = (
      a.sourceName?.trim() ||
      hostnameFromUrl(a.newsUrl) ||
      "?"
    ).toLowerCase();
    if (seen.has(label)) {
      continue;
    }
    seen.add(label);
    out.push(a);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

function faviconUrlForArticle(a: FinancialEventArticlePreview): string {
  try {
    const host = new URL(a.newsUrl).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
  } catch {
    return "";
  }
}

function faviconUrlFromArticleLink(link: string): string {
  try {
    const host = new URL(link).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
  } catch {
    return "";
  }
}

function RssSourceFavicon({ link }: { readonly link: string }) {
  const fav = faviconUrlFromArticleLink(link);
  const host = hostnameFromUrl(link);
  const initial = (host.slice(0, 1) || "?").toUpperCase();
  return (
    <span
      aria-hidden
      className="relative inline-flex size-5 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/60"
    >
      {fav ? (
        <img
          alt=""
          className="size-full object-cover"
          decoding="async"
          loading="lazy"
          src={fav}
        />
      ) : (
        <span className="text-muted-foreground flex size-full items-center justify-center text-[9px] font-bold">
          {initial}
        </span>
      )}
    </span>
  );
}

function SourceIconRow({
  articles,
  size = "md",
}: {
  articles: readonly FinancialEventArticlePreview[];
  size?: "md" | "sm";
}) {
  const sources = uniqueSourceArticles(articles, 6);
  const ring = size === "sm" ? "size-5" : "size-6";
  return (
    <div className="flex items-center">
      {sources.map((a, i) => {
        const fav = faviconUrlForArticle(a);
        const initial = (
          a.sourceName?.trim() ||
          hostnameFromUrl(a.newsUrl) ||
          "?"
        )
          .slice(0, 2)
          .toUpperCase();
        return (
          <span
            aria-hidden
            className={cn(
              "relative inline-flex overflow-hidden rounded-full",
              ring,
              i > 0 && "-ml-2"
            )}
            key={a.id}
          >
            {fav ? (
              <img
                alt=""
                className="size-full object-cover"
                decoding="async"
                loading="lazy"
                src={fav}
              />
            ) : (
              <span className="bg-background flex size-full items-center justify-center rounded-full text-[8px] font-bold text-muted-foreground">
                {initial}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function TickerIconRow({
  tickers,
  size = 22,
}: {
  readonly tickers: readonly string[];
  size?: number;
}) {
  const list = tickers
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 6);
  if (list.length === 0) {
    return null;
  }
  return (
    <div aria-hidden className="flex items-center gap-1.5">
      {list.map((sym) => (
        <TickerLogo key={sym} size={size} symbol={sym} />
      ))}
    </div>
  );
}

function FeaturedEventSummary({ text }: { readonly text: string }) {
  return (
    <p className="text-muted-foreground w-full min-w-0 line-clamp-4 text-pretty text-sm leading-relaxed sm:text-base">
      {text}
    </p>
  );
}

function FeaturedEvent({
  event,
  imageRight,
  renderEventLink,
}: {
  event: FinancialEventCard;
  imageRight: boolean;
  renderEventLink?: (event: FinancialEventCard, inner: ReactNode) => ReactNode;
}) {
  const summary = event.summary?.trim() || event.eventText?.trim() || null;
  const img = event.articles.find((a) => a.imageUrl?.trim())?.imageUrl;
  const ts = eventTimestampMs(event);
  const timeLabel = ts === null ? null : compactTimeAgo(ts);

  const textColumn = (
    <div className="flex min-h-0 w-full min-w-0 flex-col gap-4 lg:h-full">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <h2 className="text-foreground shrink-0 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {event.eventName}
        </h2>
        {summary ? <FeaturedEventSummary text={summary} /> : null}
      </div>
      <div className="flex w-full shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {event.articles.length > 0 ? (
            <SourceIconRow articles={event.articles} />
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TickerIconRow tickers={event.tickers} />
          {timeLabel && ts !== null ? (
            <time
              className="text-muted-foreground shrink-0 text-sm tabular-nums"
              dateTime={new Date(ts).toISOString()}
            >
              {timeLabel}
            </time>
          ) : null}
        </div>
      </div>
    </div>
  );

  /** Aspect box sets row height on large screens; when the text column is taller, this column stretches and the image covers. */
  const imgBlock = img ? (
    <div
      className={cn(
        "relative w-full max-w-full shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm",
        "aspect-[16/10]",
        "lg:aspect-auto lg:h-full lg:min-h-[264px] lg:w-[min(100%,440px)] lg:max-w-[440px] lg:self-stretch"
      )}
    >
      <img
        alt=""
        className="absolute inset-0 size-full object-cover"
        decoding="async"
        loading="lazy"
        src={img}
      />
    </div>
  ) : (
    <div
      className={cn(
        "w-full max-w-full shrink-0 rounded-2xl bg-gradient-to-br from-muted to-muted/30",
        "aspect-[16/10]",
        "lg:aspect-auto lg:h-full lg:min-h-[264px] lg:w-[min(100%,440px)] lg:max-w-[440px] lg:self-stretch"
      )}
    />
  );

  const article = (
    <article
      className={cn(
        "flex flex-col gap-6 lg:grid lg:items-stretch lg:gap-10",
        imageRight
          ? "lg:grid-cols-[minmax(0,1fr)_min(100%,440px)]"
          : "lg:grid-cols-[min(100%,440px)_minmax(0,1fr)]"
      )}
    >
      {imageRight ? (
        <>
          {textColumn}
          {imgBlock}
        </>
      ) : (
        <>
          {imgBlock}
          {textColumn}
        </>
      )}
    </article>
  );

  if (renderEventLink) {
    return renderEventLink(event, article);
  }
  return article;
}

function GridCard({
  event,
  renderEventLink,
}: {
  event: FinancialEventCard;
  renderEventLink?: (event: FinancialEventCard, inner: ReactNode) => ReactNode;
}) {
  const img = event.articles.find((a) => a.imageUrl?.trim())?.imageUrl;
  const ts = eventTimestampMs(event);
  const timeLabel = ts === null ? null : compactTimeAgo(ts);

  const card = (
    <CobaltCard className="flex h-full flex-col gap-0 overflow-hidden p-0 transition-colors hover:bg-[oklch(0.94_0_0)] dark:hover:bg-white/[0.08]">
      <div className="bg-muted/50 relative aspect-[16/10] w-full shrink-0 overflow-hidden">
        {img ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            loading="lazy"
            src={img}
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-muted to-muted/40" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pt-2 pb-4">
        <h3 className="text-foreground line-clamp-3 text-base font-semibold leading-snug">
          {event.eventName}
        </h3>
        <div className="mt-auto flex w-full items-center justify-between gap-2 pt-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {event.articles.length > 0 ? (
              <SourceIconRow articles={event.articles} size="sm" />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <TickerIconRow size={18} tickers={event.tickers} />
            {timeLabel && ts !== null ? (
              <time
                className="text-muted-foreground shrink-0 text-xs tabular-nums"
                dateTime={new Date(ts).toISOString()}
              >
                {timeLabel}
              </time>
            ) : null}
          </div>
        </div>
      </div>
    </CobaltCard>
  );

  if (renderEventLink) {
    return renderEventLink(event, card);
  }
  return card;
}

/**
 * Layout rhythm:
 * 1. **One-off** lead featured (text left, image right)
 * 2. **Grid** (up to 3 cards)
 * 3. Repeat: **featured pair** (image left → image right) → **grid** (up to 3)
 * 4. Trailing orphan → single featured (image left)
 */
function buildSections(
  events: readonly FinancialEventCard[]
): MagazineSection[] {
  const sections: MagazineSection[] = [];
  const n = events.length;
  if (n === 0) {
    return sections;
  }

  const [firstEvent] = events;
  if (firstEvent === undefined) {
    return sections;
  }
  sections.push({
    event: firstEvent,
    imageRight: true,
    type: "featured",
  });
  let i = 1;

  if (i >= n) {
    return sections;
  }

  const leadGridCount = Math.min(3, n - i);
  sections.push({
    events: events.slice(i, i + leadGridCount),
    type: "grid",
  });
  i += leadGridCount;

  while (i < n) {
    if (i + 1 < n) {
      const first = events[i];
      const second = events[i + 1];
      if (first !== undefined && second !== undefined) {
        sections.push({
          first,
          second,
          type: "featuredPair",
        });
      }
      i += 2;
    } else {
      const event = events[i];
      if (event !== undefined) {
        sections.push({
          event,
          imageRight: false,
          type: "featured",
        });
      }
      i += 1;
    }

    if (i >= n) {
      break;
    }

    const chunk = Math.min(3, n - i);
    sections.push({
      events: events.slice(i, i + chunk),
      type: "grid",
    });
    i += chunk;
  }

  return sections;
}

function NewsTabs({
  tab,
  onTabChange,
}: {
  tab: NewsTab;
  onTabChange: (t: NewsTab) => void;
}) {
  return (
    <div className="border-border mb-8 border-b">
      <nav
        aria-label="News sections"
        className="flex flex-wrap gap-x-8 gap-y-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-nowrap sm:gap-x-10 sm:overflow-x-auto [&::-webkit-scrollbar]:hidden"
      >
        {NEWS_TAB_DEFS.map(({ id, label }) => (
          <button
            className={cn(
              "relative shrink-0 pb-3 text-base transition-colors",
              tab === id
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={id}
            onClick={() => onTabChange(id)}
            type="button"
          >
            {label}
            {tab === id ? (
              <span className="bg-amber-500 absolute inset-x-0 bottom-0 h-0.5 rounded-full" />
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  );
}

/** ~row height for title + meta + padding (no sidebar scroll; slice to viewport). */
const RSS_ROW_ESTIMATE_PX = 92;

function LatestNewsSidebar({
  rssItems,
}: {
  readonly rssItems: readonly NewsMagazineSidebarItem[];
}) {
  const ulRef = useRef<HTMLUListElement>(null);
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(rssItems.length, 8)
  );

  useLayoutEffect(() => {
    if (rssItems.length === 0) {
      return;
    }

    const list = ulRef.current;
    if (!list) {
      return;
    }

    const BOTTOM_PAD = 16;
    let rafId = 0;

    const measure = () => {
      const el = ulRef.current;
      if (!el) {
        return;
      }
      const { top } = el.getBoundingClientRect();
      const viewportH =
        typeof window !== "undefined" && window.visualViewport !== null
          ? window.visualViewport.height
          : window.innerHeight;
      const available = Math.max(0, viewportH - top - BOTTOM_PAD);
      const n = Math.max(1, Math.floor(available / RSS_ROW_ESTIMATE_PX));
      setVisibleCount((prev) => {
        const next = Math.min(n, rssItems.length);
        return prev === next ? prev : next;
      });
    };

    const scheduleMeasure = () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        measure();
      });
    };

    measure();
    const ro = new ResizeObserver(scheduleMeasure);
    ro.observe(document.documentElement);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    if (window.visualViewport !== null) {
      window.visualViewport.addEventListener("resize", scheduleMeasure);
    }

    return () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure);
      if (window.visualViewport !== null) {
        window.visualViewport.removeEventListener("resize", scheduleMeasure);
      }
    };
  }, [rssItems]);

  if (rssItems.length === 0) {
    return null;
  }

  const visible = rssItems.slice(0, visibleCount);

  return (
    <>
      <h3 className="text-foreground mb-4 text-lg font-bold tracking-tight">
        Latest News
      </h3>
      <ul className="space-y-1" ref={ulRef}>
        {visible.map((item) => (
          <li key={item.id}>
            <a
              className="hover:bg-muted/40 -mx-2 block min-w-0 rounded-lg px-2 py-3 transition-colors"
              href={item.link}
              rel="noopener noreferrer"
              target="_blank"
            >
              <p className="text-foreground break-words font-semibold leading-snug">
                {decodeHtmlEntities(item.title)}
              </p>
              <p className="text-muted-foreground mt-1.5 flex w-full min-w-0 items-center gap-2 text-sm">
                <RssSourceFavicon link={item.link} />
                {item.publishedAt === null ? null : (
                  <time
                    className="ml-auto shrink-0 tabular-nums"
                    dateTime={new Date(item.publishedAt).toISOString()}
                  >
                    {formatDistanceStrict(
                      new Date(item.publishedAt),
                      new Date(),
                      { addSuffix: true }
                    )}
                  </time>
                )}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

export function NewsMagazine({
  eventsGeneral,
  eventsForYou,
  rssItems,
  defaultTab = "general",
  className,
  renderEventLink,
}: NewsMagazineProps) {
  const [tab, setTab] = useState<NewsTab>(defaultTab);

  const activeEvents = useMemo(() => {
    if (tab === "for-you") {
      return eventsForYou;
    }
    if (tab === "general") {
      return eventsGeneral;
    }
    return eventsGeneral.filter((e) => eventMatchesTopicSlug(e, tab));
  }, [tab, eventsGeneral, eventsForYou]);

  const sections = useMemo(() => buildSections(activeEvents), [activeEvents]);

  return (
    <div className={cn("w-full", className)}>
      <NewsTabs onTabChange={setTab} tab={tab} />

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10 lg:space-y-12">
          {sections.map((sec) => {
            if (sec.type === "featuredPair") {
              return (
                <div
                  className="flex flex-col gap-8 lg:gap-10"
                  key={`fp-${sec.first.id}-${sec.second.id}`}
                >
                  <FeaturedEvent
                    event={sec.first}
                    imageRight={false}
                    renderEventLink={renderEventLink}
                  />
                  <FeaturedEvent
                    event={sec.second}
                    imageRight={true}
                    renderEventLink={renderEventLink}
                  />
                </div>
              );
            }
            if (sec.type === "featured") {
              return (
                <FeaturedEvent
                  event={sec.event}
                  imageRight={sec.imageRight}
                  key={`f-${sec.event.id}`}
                  renderEventLink={renderEventLink}
                />
              );
            }
            const gridKey = sec.events.map((e) => e.id).join("-");
            return (
              <div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                key={`g-${gridKey}`}
              >
                {sec.events.map((e) => (
                  <GridCard
                    event={e}
                    key={e.id}
                    renderEventLink={renderEventLink}
                  />
                ))}
              </div>
            );
          })}
        </div>

        <aside className="border-border min-w-0 space-y-1 overflow-x-hidden border-t pt-8 lg:sticky lg:top-4 lg:border-t-0 lg:pt-0">
          <LatestNewsSidebar rssItems={rssItems} />
        </aside>
      </div>
    </div>
  );
}
