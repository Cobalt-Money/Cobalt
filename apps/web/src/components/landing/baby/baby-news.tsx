import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { cn } from "@cobalt-web/ui/lib/utils";
import { formatDistanceStrict } from "date-fns";
import { useMemo, useState } from "react";

interface FinancialEventCard {
  id: string;
  eventName: string;
  eventText: string;
  summary: string;
  tickers: string[];
  topics: string[];
  sentiment: "positive" | "negative" | "neutral";
  date: number;
  newsItems: number;
  articles: {
    id: string;
    title: string;
    sourceName: string;
    imageUrl: string | null;
    newsUrl: string;
  }[];
}

interface NewsMagazineSidebarItem {
  id: string;
  title: string;
  link: string;
  publishedAt: number | null;
}

interface BabyNewsProps {
  eventsGeneral: FinancialEventCard[];
  eventsForYou: FinancialEventCard[];
  rssItems: NewsMagazineSidebarItem[];
}

const NEWS_TAB_DEFS = [
  { id: "general", label: "General" },
  { id: "for-you", label: "For You" },
  { id: "tech", label: "Tech" },
  { id: "government", label: "Government" },
  { id: "ai", label: "AI" },
  { id: "announcement", label: "Announcement" },
  { id: "earnings", label: "Earnings" },
] as const;

type NewsTab = (typeof NEWS_TAB_DEFS)[number]["id"];

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

function faviconUrlFromLink(link: string): string {
  try {
    const host = new URL(link).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
  } catch {
    return "";
  }
}

function RssSourceFavicon({ link }: { readonly link: string }) {
  const fav = faviconUrlFromLink(link);
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
        <span className="flex size-full items-center justify-center text-[9px] font-bold text-muted-foreground">
          {initial}
        </span>
      )}
    </span>
  );
}

function TickerIconRow({ tickers }: { readonly tickers: string[] }) {
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
        <TickerLogo key={sym} size={22} symbol={sym} />
      ))}
    </div>
  );
}

function FeaturedEvent({ event }: { event: FinancialEventCard }) {
  const img = event.articles.find((a) => a.imageUrl?.trim())?.imageUrl ?? null;
  const timeLabel = compactTimeAgo(event.date);
  const sourceName = event.articles[0]?.sourceName ?? null;

  return (
    <article className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,440px)] lg:items-stretch lg:gap-10">
      <div className="flex min-h-0 w-full min-w-0 flex-col gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <h2 className="shrink-0 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {event.eventName}
          </h2>
          {event.summary ? (
            <p className="line-clamp-4 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {event.summary}
            </p>
          ) : null}
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            {sourceName ? (
              <span className="text-sm text-muted-foreground">
                {sourceName}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TickerIconRow tickers={event.tickers} />
            <time
              className="shrink-0 text-sm tabular-nums text-muted-foreground"
              dateTime={new Date(event.date).toISOString()}
            >
              {timeLabel}
            </time>
          </div>
        </div>
      </div>
      {img ? (
        <div className="relative aspect-[16/10] w-full max-w-full shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm lg:aspect-auto lg:h-full lg:min-h-[264px] lg:self-stretch">
          <img
            alt=""
            className="absolute inset-0 size-full object-cover"
            decoding="async"
            loading="lazy"
            src={img}
          />
        </div>
      ) : (
        <div className="aspect-[16/10] w-full max-w-full shrink-0 rounded-2xl bg-gradient-to-br from-muted to-muted/30 lg:aspect-auto lg:h-full lg:min-h-[264px] lg:self-stretch" />
      )}
    </article>
  );
}

function GridCard({ event }: { event: FinancialEventCard }) {
  const img = event.articles.find((a) => a.imageUrl?.trim())?.imageUrl ?? null;
  const timeLabel = compactTimeAgo(event.date);
  const sourceName = event.articles[0]?.sourceName ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:bg-accent/40">
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted/50">
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
      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-2">
        <h3 className="line-clamp-3 text-base font-semibold leading-snug text-foreground">
          {event.eventName}
        </h3>
        <div className="mt-auto flex w-full items-center justify-between gap-2 pt-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {sourceName ? (
              <span className="truncate text-xs text-muted-foreground">
                {sourceName}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <time
              className="shrink-0 text-xs tabular-nums text-muted-foreground"
              dateTime={new Date(event.date).toISOString()}
            >
              {timeLabel}
            </time>
          </div>
        </div>
      </div>
    </div>
  );
}

function eventMatchesTab(event: FinancialEventCard, tab: NewsTab): boolean {
  if (tab === "general") {
    return true;
  }
  const normalized = tab.toLowerCase();
  return event.topics.some((t) => t.trim().toLowerCase() === normalized);
}

export function BabyNews({
  eventsGeneral,
  eventsForYou,
  rssItems,
}: BabyNewsProps) {
  const [activeTab, setActiveTab] = useState<NewsTab>("general");

  const events = useMemo(() => {
    if (activeTab === "for-you") {
      return eventsForYou;
    }
    return eventsGeneral.filter((e) => eventMatchesTab(e, activeTab));
  }, [activeTab, eventsGeneral, eventsForYou]);

  const [featuredEvent, ...remainingEvents] = events;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto">
      <nav aria-label="News sections" className="mb-8 border-b border-border">
        <div className="flex flex-wrap gap-x-8 gap-y-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-nowrap sm:gap-x-10 sm:overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {NEWS_TAB_DEFS.map(({ id, label }) => (
            <button
              className={cn(
                "relative shrink-0 pb-3 text-base transition-colors",
                activeTab === id
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={id}
              onClick={() => setActiveTab(id)}
              type="button"
            >
              {label}
              {activeTab === id ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-amber-500" />
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10">
          {featuredEvent === undefined ? null : (
            <FeaturedEvent event={featuredEvent} />
          )}

          {remainingEvents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {remainingEvents.map((event) => (
                <GridCard event={event} key={event.id} />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="hidden border-t border-border pt-8 lg:block lg:sticky lg:top-4 lg:border-t-0 lg:pt-0">
          {rssItems.length > 0 ? (
            <>
              <h3 className="mb-4 text-lg font-bold tracking-tight text-foreground">
                Latest News
              </h3>
              <ul className="space-y-1">
                {rssItems.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <a
                      className="-mx-2 block min-w-0 rounded-lg px-2 py-3 transition-colors hover:bg-muted/40"
                      href={item.link}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <p className="break-words font-semibold leading-snug text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1.5 flex w-full min-w-0 items-center gap-2 text-sm text-muted-foreground">
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
          ) : null}
        </aside>
      </div>
    </div>
  );
}
