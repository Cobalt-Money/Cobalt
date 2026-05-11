import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { Card } from "@cobalt-web/ui/components/card";
import { EventArticleContent } from "@cobalt-web/ui/cobalt/news/event-article-content";
import type { EventArticleSource } from "@cobalt-web/ui/cobalt/news/event-article-content";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { EventArticle, FinancialEvent } from "@cobalt-web/zero";
import { LinkSquare01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Link } from "@/components/links";
import { useFinancialEventDetail } from "@/hooks/use-financial-event-detail";

type EventArticleRow = EventArticle;
type FinancialEventDetailRow = FinancialEvent & { articles?: readonly EventArticleRow[] };

function parseTickers(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) {
      out.push(x.trim().toUpperCase());
    }
  }
  return out;
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const [shortId] = u.pathname.replace(/^\//, "").split("/");
      return shortId ? `https://www.youtube.com/embed/${shortId}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) {
        return `https://www.youtube.com/embed/${v}`;
      }
      const m = u.pathname.match(/\/embed\/([^/?]+)/);
      if (m?.[1]) {
        return `https://www.youtube.com/embed/${m[1]}`;
      }
      const short = u.pathname.match(/\/shorts\/([^/?]+)/);
      if (short?.[1]) {
        return `https://www.youtube.com/embed/${short[1]}`;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function pickVideoEmbed(articles: readonly EventArticleRow[]): string | null {
  for (const a of articles) {
    const t = a.type?.trim().toLowerCase();
    if (t === "video" || t === "youtube") {
      const fromUrl = youtubeEmbedUrl(a.newsUrl);
      if (fromUrl) {
        return fromUrl;
      }
    }
  }
  for (const a of articles) {
    const fromUrl = youtubeEmbedUrl(a.newsUrl);
    if (fromUrl) {
      return fromUrl;
    }
  }
  return null;
}

function eventTimestampMs(row: FinancialEventDetailRow): number | null {
  if (row.date !== undefined && row.date !== null) {
    return row.date;
  }
  if (row.createdAt !== undefined && row.createdAt !== null) {
    return row.createdAt;
  }
  return null;
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function faviconUrlForNewsUrl(url: string): string {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
  } catch {
    return "";
  }
}

function StoryHeader({
  event,
  timeLabel,
  ts,
  tickers,
}: {
  event: FinancialEventDetailRow;
  timeLabel: string | null;
  ts: number | null;
  tickers: readonly string[];
}) {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
        {event.eventName}
      </h1>
      <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
        {timeLabel && ts !== null ? (
          <time dateTime={new Date(ts).toISOString()}>{timeLabel}</time>
        ) : null}
        {event.sentiment?.trim() ? (
          <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium capitalize">
            {event.sentiment.trim()}
          </span>
        ) : null}
      </div>
      {tickers.length > 0 ? (
        <div aria-label="Related tickers" className="flex flex-wrap gap-2">
          {tickers.map((sym) => (
            <Link
              className="ring-border hover:bg-muted/50 inline-flex items-center gap-1.5 rounded-full py-1 pr-2 pl-1 text-sm font-medium ring-1 transition-colors"
              key={sym}
              params={{ symbol: sym }}
              to="/research/$symbol"
            >
              <TickerLogo size={22} symbol={sym} />
              <span>{sym}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function HeroImage({ src }: { src: string }) {
  return (
    <div className="bg-muted relative aspect-[16/10] w-full overflow-hidden rounded-2xl shadow-sm">
      <img
        alt=""
        className="absolute inset-0 size-full object-cover"
        decoding="async"
        fetchPriority="high"
        src={src}
      />
    </div>
  );
}

function VideoEmbedSection({ embedUrl }: { embedUrl: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">Video</h2>
      <div className={cn("bg-muted relative w-full overflow-hidden rounded-xl", "aspect-video")}>
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedUrl}
          title="Related video"
        />
      </div>
    </section>
  );
}

function SourceArticleCard({ article, index }: { article: EventArticleRow; index: number }) {
  const host = article.sourceName?.trim() || hostnameFromUrl(article.newsUrl) || "Source";
  const fav = faviconUrlForNewsUrl(article.newsUrl);
  return (
    <li>
      <a
        className="group block h-full"
        href={article.newsUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Card
          variant="subtle"
          className="flex h-full flex-col gap-2.5 p-3.5 transition-colors group-hover:bg-[oklch(0.94_0_0)] dark:group-hover:bg-white/[0.08]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="bg-background ring-border/60 relative inline-flex size-5 shrink-0 overflow-hidden rounded-full ring-1"
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
                  <span className="text-muted-foreground flex size-full items-center justify-center text-[8px] font-bold">
                    {host.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="text-muted-foreground truncate text-xs lowercase">{host}</span>
            </div>
            <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums">
              <span>{index + 1}</span>
              <HugeiconsIcon
                aria-hidden
                className="opacity-60 transition-opacity group-hover:opacity-100"
                icon={LinkSquare01Icon}
                size={12}
                strokeWidth={2}
              />
            </span>
          </div>
          <p className="text-foreground line-clamp-3 text-sm leading-snug font-medium">
            {article.title}
          </p>
        </Card>
      </a>
    </li>
  );
}

function SourcesSection({ articles }: { articles: readonly EventArticleRow[] }) {
  if (articles.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Sources</h2>
        <span className="text-muted-foreground text-xs tabular-nums">{articles.length}</span>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {articles.map((a, i) => (
          <SourceArticleCard article={a} index={i} key={a.id} />
        ))}
      </ul>
    </section>
  );
}

function renderArticleBody({
  articleSources,
  eventText,
  summary,
}: {
  articleSources: readonly EventArticleSource[];
  eventText: string | null;
  summary: string | null;
}) {
  if (summary) {
    return (
      <section className="flex flex-col gap-2">
        <EventArticleContent markdown={summary} sources={articleSources} />
      </section>
    );
  }
  if (eventText) {
    return (
      <section className="flex flex-col gap-2">
        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{eventText}</p>
      </section>
    );
  }
  return null;
}

export function FinancialEventDetailPage({ eventId }: { eventId: string }) {
  const { event: raw } = useFinancialEventDetail(eventId);

  if (raw === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <p className="text-muted-foreground text-sm">
          This story could not be loaded. It may have been removed or the link is invalid.
        </p>
      </div>
    );
  }

  const event = raw as FinancialEventDetailRow;
  const articles = event.articles ?? [];
  const tickers = parseTickers(event.tickers);
  const summary = event.summary?.trim() || null;
  const eventText = event.eventText?.trim() || null;
  const articleSources: EventArticleSource[] = articles.map((a) => ({
    id: a.id,
    newsUrl: a.newsUrl,
    sourceName: a.sourceName ?? null,
    title: a.title,
  }));
  const heroImage = articles.find((a) => a.imageUrl?.trim())?.imageUrl?.trim() ?? null;
  const videoEmbed = pickVideoEmbed(articles);
  const ts = eventTimestampMs(event);
  const timeLabel =
    ts === null
      ? null
      : new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(ts));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <StoryHeader event={event} timeLabel={timeLabel} tickers={tickers} ts={ts} />

      {heroImage ? <HeroImage src={heroImage} /> : null}

      {renderArticleBody({ articleSources, eventText, summary })}

      {videoEmbed ? <VideoEmbedSection embedUrl={videoEmbed} /> : null}

      <SourcesSection articles={articles} />
    </div>
  );
}
