import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { buttonVariants } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { useFinancialEventDetail } from "@/hooks/use-financial-event-detail";

/** Narrow shape for synced financial event + articles (Zero row typing is permissive). */
interface EventArticleRow {
  readonly id: string;
  readonly title: string;
  readonly newsUrl: string;
  readonly imageUrl?: string | null;
  readonly sourceName?: string | null;
  readonly text?: string | null;
  readonly type?: string | null;
}

interface FinancialEventDetailRow {
  readonly id: string;
  readonly eventName: string;
  readonly summary?: string | null;
  readonly eventText?: string | null;
  readonly sentiment?: string | null;
  readonly keyPoints?: unknown;
  readonly tickers?: unknown;
  readonly date?: number | null;
  readonly createdAt?: number | null;
  readonly articles?: readonly EventArticleRow[];
}

function parseKeyPoints(raw: unknown): string[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === "string" && x.trim()) {
      out.push(x.trim());
    } else if (x !== null && typeof x === "object" && "text" in x) {
      const t = (x as { text?: unknown }).text;
      if (typeof t === "string" && t.trim()) {
        out.push(t.trim());
      }
    }
  }
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const s of out) {
    if (seen.has(s)) {
      continue;
    }
    seen.add(s);
    deduped.push(s);
  }
  return deduped;
}

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

function BackToNewsLink() {
  return (
    <Link
      className={cn(buttonVariants({ variant: "ghost" }), "w-fit")}
      to="/news"
    >
      <ArrowLeft aria-hidden className="mr-2 size-4" />
      Back to News
    </Link>
  );
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

function KeyPointsSection({ lines }: { lines: readonly string[] }) {
  if (lines.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">Key points</h2>
      <ul className="list-disc space-y-2 pl-5">
        {lines.map((line) => (
          <li className="text-muted-foreground leading-relaxed" key={line}>
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}

function VideoEmbedSection({ embedUrl }: { embedUrl: string }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">Video</h2>
      <div
        className={cn(
          "bg-muted relative w-full overflow-hidden rounded-xl",
          "aspect-video"
        )}
      >
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
          sandbox="allow-scripts allow-presentation allow-popups allow-popups-to-escape-sandbox"
          src={embedUrl}
          title="Related video"
        />
      </div>
    </section>
  );
}

function SourceArticleCard({ article }: { article: EventArticleRow }) {
  const host =
    article.sourceName?.trim() || hostnameFromUrl(article.newsUrl) || "Source";
  const fav = faviconUrlForNewsUrl(article.newsUrl);
  const snippet = article.text?.trim();
  return (
    <li>
      <a
        className="border-border bg-card hover:bg-muted/40 -mx-3 flex gap-3 rounded-xl border px-3 py-3 transition-colors"
        href={article.newsUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span
          aria-hidden
          className="relative mt-0.5 inline-flex size-9 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border/60"
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
            <span className="text-muted-foreground flex size-full items-center justify-center text-[10px] font-bold">
              {host.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-foreground flex items-start justify-between gap-2 font-medium leading-snug">
            <span className="min-w-0">{article.title}</span>
            <ExternalLink
              aria-hidden
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
            />
          </span>
          <span className="text-muted-foreground mt-1 block text-sm">
            {host}
          </span>
          {snippet ? (
            <span className="text-muted-foreground mt-2 line-clamp-3 block text-sm leading-relaxed">
              {snippet}
            </span>
          ) : null}
        </span>
      </a>
    </li>
  );
}

function SourcesSection({
  articles,
}: {
  articles: readonly EventArticleRow[];
}) {
  if (articles.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">Sources</h2>
      <ul className="flex flex-col gap-3">
        {articles.map((a) => (
          <SourceArticleCard article={a} key={a.id} />
        ))}
      </ul>
    </section>
  );
}

export function FinancialEventDetailPage({ eventId }: { eventId: string }) {
  const { event: raw } = useFinancialEventDetail(eventId);

  if (raw === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <BackToNewsLink />
        <p className="text-muted-foreground text-sm">
          This story could not be loaded. It may have been removed or the link
          is invalid.
        </p>
      </div>
    );
  }

  const event = raw as FinancialEventDetailRow;
  const articles = event.articles ?? [];
  const keyPoints = parseKeyPoints(event.keyPoints);
  const tickers = parseTickers(event.tickers);
  const summary = event.summary?.trim() || null;
  const eventText = event.eventText?.trim() || null;
  const heroImage =
    articles.find((a) => a.imageUrl?.trim())?.imageUrl?.trim() ?? null;
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
      <BackToNewsLink />

      <StoryHeader
        event={event}
        timeLabel={timeLabel}
        tickers={tickers}
        ts={ts}
      />

      {heroImage ? <HeroImage src={heroImage} /> : null}

      {summary ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Summary</h2>
          <p className="text-muted-foreground leading-relaxed">{summary}</p>
        </section>
      ) : null}

      <KeyPointsSection lines={keyPoints} />

      {eventText && eventText !== summary ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Details</h2>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {eventText}
          </p>
        </section>
      ) : null}

      {videoEmbed ? <VideoEmbedSection embedUrl={videoEmbed} /> : null}

      <SourcesSection articles={articles} />
    </div>
  );
}
