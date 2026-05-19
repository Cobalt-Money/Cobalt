import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import type { FinancialEventCard } from "@cobalt-web/ui/cobalt/news/financial-events-feed";
import type { NewsMagazineSidebarItem } from "@cobalt-web/ui/cobalt/news/news-magazine";
import { cn } from "@cobalt-web/ui/lib/utils";
import { formatDistanceStrict } from "date-fns";
import { useMemo, useState } from "react";

interface BabyNewsProps {
  eventsGeneral: FinancialEventCard[];
  eventsForYou: FinancialEventCard[];
  rssItems: NewsMagazineSidebarItem[];
  onOpenEvent?: (event: FinancialEventCard) => void;
  onOpenRssItem?: (item: NewsMagazineSidebarItem) => void;
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
      className="relative inline-flex size-4 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/60"
    >
      {fav ? (
        <img alt="" className="size-full object-cover" decoding="async" loading="lazy" src={fav} />
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
        <TickerLogo key={sym} size={16} symbol={sym} />
      ))}
    </div>
  );
}

function RssItemBody({ item }: { item: NewsMagazineSidebarItem }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="break-words text-left text-xs font-semibold leading-snug text-foreground">
        {item.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <RssSourceFavicon link={item.link} />
          <span className="text-xs text-muted-foreground">{hostnameFromUrl(item.link)}</span>
        </div>
        {item.publishedAt === null ? null : (
          <time
            className="shrink-0 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
            dateTime={new Date(item.publishedAt).toISOString()}
          >
            {formatDistanceStrict(new Date(item.publishedAt), new Date(), {
              addSuffix: true,
            })}
          </time>
        )}
      </div>
    </div>
  );
}

function FeaturedEvent({
  event,
  onOpen,
}: {
  event: FinancialEventCard;
  onOpen?: (event: FinancialEventCard) => void;
}) {
  const img = event.articles.find((a) => a.imageUrl?.trim())?.imageUrl ?? null;
  const timeLabel = typeof event.date === "number" ? compactTimeAgo(event.date) : "";
  const sourceName = event.articles[0]?.sourceName ?? null;
  const sourceUrl = event.articles[0]?.newsUrl ?? null;

  const Wrapper = onOpen ? "button" : "article";
  const wrapperProps = onOpen
    ? {
        onClick: () => onOpen(event),
        type: "button" as const,
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "flex flex-col gap-6 text-left lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,320px)] lg:items-stretch lg:gap-10",
        onOpen && "cursor-pointer rounded-2xl transition-colors hover:bg-accent/30",
      )}
    >
      <div className="flex min-h-0 w-full min-w-0 flex-col gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <h2 className="shrink-0 text-left text-lg font-bold leading-tight tracking-tight text-foreground sm:text-xl">
            {event.eventName}
          </h2>
          {event.summary ? (
            <p className="line-clamp-4 text-left text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {event.summary}
            </p>
          ) : null}
        </div>
        <div className="flex w-full shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            {sourceName ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {sourceUrl ? <RssSourceFavicon link={sourceUrl} /> : null}
                {sourceName}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <TickerIconRow tickers={[...event.tickers]} />
            <time
              className="shrink-0 text-xs tabular-nums text-muted-foreground"
              dateTime={
                typeof event.date === "number" ? new Date(event.date).toISOString() : undefined
              }
            >
              {timeLabel}
            </time>
          </div>
        </div>
      </div>
      {img ? (
        <div className="relative aspect-[16/9] w-full max-w-full shrink-0 overflow-hidden rounded-2xl bg-muted shadow-sm lg:aspect-[16/10] lg:max-h-48">
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
    </Wrapper>
  );
}

function GridCard({
  event,
  onOpen,
}: {
  event: FinancialEventCard;
  onOpen?: (event: FinancialEventCard) => void;
}) {
  const img = event.articles.find((a) => a.imageUrl?.trim())?.imageUrl ?? null;
  const timeLabel = typeof event.date === "number" ? compactTimeAgo(event.date) : "";
  const sourceName = event.articles[0]?.sourceName ?? null;
  const sourceUrl = event.articles[0]?.newsUrl ?? null;

  const Wrapper = onOpen ? "button" : "div";
  const wrapperProps = onOpen
    ? {
        onClick: () => onOpen(event),
        type: "button" as const,
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border bg-card text-left transition-colors hover:bg-accent/40",
        onOpen && "cursor-pointer",
      )}
    >
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
        <h3 className="line-clamp-3 text-left text-sm font-semibold leading-snug text-foreground">
          {event.eventName}
        </h3>
        <div className="mt-auto flex w-full items-center justify-between gap-2 pt-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {sourceName ? (
              <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                {sourceUrl ? <RssSourceFavicon link={sourceUrl} /> : null}
                {sourceName}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <time
              className="shrink-0 text-xs tabular-nums text-muted-foreground"
              dateTime={
                typeof event.date === "number" ? new Date(event.date).toISOString() : undefined
              }
            >
              {timeLabel}
            </time>
          </div>
        </div>
      </div>
    </Wrapper>
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
  onOpenEvent,
  onOpenRssItem,
}: BabyNewsProps) {
  const [activeTab, setActiveTab] = useState<NewsTab>("general");

  const events = useMemo(() => {
    if (activeTab === "for-you") {
      return eventsForYou;
    }
    return eventsGeneral.filter((e) => eventMatchesTab(e, activeTab));
  }, [activeTab, eventsGeneral, eventsForYou]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden pl-4 pt-1">
      <nav aria-label="News sections" className="mb-8 border-b border-border">
        <div className="flex flex-wrap gap-x-8 gap-y-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-nowrap sm:gap-x-10 sm:overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {NEWS_TAB_DEFS.map(({ id, label }) => (
            <button
              className={cn(
                "relative shrink-0 pb-3 text-base transition-colors",
                activeTab === id
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
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
          {events.length > 0 ? (
            <div className="space-y-10">
              {events.map((event, idx) => {
                const posInCycle = idx % 4;
                if (posInCycle === 0) {
                  const nextEvent1 = events[idx + 1];
                  const nextEvent2 = events[idx + 2];
                  const nextEvent3 = events[idx + 3];
                  return (
                    <div key={event.id} className="space-y-10">
                      <FeaturedEvent event={event} onOpen={onOpenEvent} />
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {nextEvent1 && <GridCard event={nextEvent1} onOpen={onOpenEvent} />}
                        {nextEvent2 && <GridCard event={nextEvent2} onOpen={onOpenEvent} />}
                        {nextEvent3 && <GridCard event={nextEvent3} onOpen={onOpenEvent} />}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : null}
        </div>

        <aside className="hidden border-t border-border pt-8 lg:block lg:sticky lg:top-4 lg:border-t-0 lg:pt-0 lg:w-64">
          {rssItems.length > 0 ? (
            <>
              <h3 className="mb-4 text-left text-base font-bold tracking-tight text-foreground">
                Latest News
              </h3>
              <ul className="space-y-1">
                {rssItems.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    {onOpenRssItem ? (
                      <button
                        className="-mx-2 block w-full min-w-0 rounded-lg px-2 py-3 text-left transition-colors hover:bg-muted/40"
                        onClick={() => onOpenRssItem(item)}
                        type="button"
                      >
                        <RssItemBody item={item} />
                      </button>
                    ) : (
                      <a
                        className="-mx-2 block min-w-0 rounded-lg px-2 py-3 transition-colors hover:bg-muted/40"
                        href={item.link}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <RssItemBody item={item} />
                      </a>
                    )}
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
