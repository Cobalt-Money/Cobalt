import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import type { FinancialEventCard } from "@cobalt-web/ui/cobalt/news/financial-events-feed";
import type { NewsMagazineSidebarItem } from "@cobalt-web/ui/cobalt/news/news-magazine";

interface Article {
  title: string;
  summary: string | null;
  body: string | null;
  bodyExtra: readonly string[];
  imageUrl: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  tickers: readonly string[];
  publishedAt: number | null;
}

function tickerPhraseFor(tickers: readonly string[]): string {
  if (tickers.length === 0) {
    return "Markets showed a measured reaction as investors digested the news.";
  }
  if (tickers.length === 1) {
    return `Shares of ${tickers[0]} moved in extended trading as investors digested the news.`;
  }
  return `Shares of ${tickers.slice(0, 2).join(" and ")} moved in extended trading as investors digested the news.`;
}

function buildExtraParagraphs(eventName: string, tickers: readonly string[]): string[] {
  const tickerPhrase = tickerPhraseFor(tickers);

  return [
    "Analysts at major Wall Street firms were quick to weigh in on the development. Several noted that the announcement, while largely in line with expectations, reinforced the broader narrative that has driven positioning over the past several quarters. Others cautioned that the full impact will take multiple reporting periods to work through the numbers, pointing to second-order effects on suppliers, partners, and adjacent sectors.",
    `${tickerPhrase} Options volume picked up noticeably in the session that followed, with traders skewing toward shorter-dated contracts — a pattern often associated with event-driven speculation rather than longer-term conviction.`,
    `The story fits a broader pattern Cobalt has been tracking across the sector. Recent filings, management commentary on earnings calls, and shifts in insider activity all pointed toward a setup like this, and several readers had flagged related items in their feeds over the past two weeks. That context matters: "${eventName}" isn't a standalone headline — it's another data point in a trend that's been building.`,
    "What to watch next: guidance updates from competitors with meaningful exposure, any follow-on commentary from regulators, and the next scheduled investor day where management is likely to be pressed on specifics. Cobalt will surface those in your feed as they land, with impact scoring against holdings you've connected.",
  ];
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function formatPublished(ms: number | null): string {
  if (ms === null) {
    return "";
  }
  return new Date(ms).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function eventToArticle(event: FinancialEventCard): Article {
  const first = event.articles[0] ?? null;
  return {
    body: event.eventText,
    bodyExtra: buildExtraParagraphs(event.eventName, event.tickers),
    imageUrl: first?.imageUrl ?? null,
    publishedAt: event.date,
    sourceName: first?.sourceName ?? null,
    sourceUrl: first?.newsUrl ?? null,
    summary: event.summary,
    tickers: event.tickers,
    title: first?.title ?? event.eventName,
  };
}

function rssItemToArticle(item: NewsMagazineSidebarItem): Article {
  return {
    body: null,
    bodyExtra: buildExtraParagraphs(item.title, []),
    imageUrl: null,
    publishedAt: item.publishedAt,
    sourceName: hostnameFromUrl(item.link),
    sourceUrl: item.link,
    summary: null,
    tickers: [],
    title: item.title,
  };
}

export function BabyNewsArticle({
  event,
  rssItem,
}: {
  event?: FinancialEventCard | null;
  rssItem?: NewsMagazineSidebarItem | null;
}) {
  let article: Article | null = null;
  if (event) {
    article = eventToArticle(event);
  } else if (rssItem) {
    article = rssItemToArticle(rssItem);
  }

  if (!article) {
    return null;
  }

  return (
    <article className="flex flex-col gap-6 text-left">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {article.sourceName ? (
            <span className="font-medium text-foreground">{article.sourceName}</span>
          ) : null}
          {article.publishedAt ? (
            <>
              <span aria-hidden>·</span>
              <time dateTime={new Date(article.publishedAt).toISOString()}>
                {formatPublished(article.publishedAt)}
              </time>
            </>
          ) : null}
        </div>
        <h2 className="text-left text-2xl font-bold leading-tight tracking-tight text-foreground">
          {article.title}
        </h2>
        {article.tickers.length > 0 ? (
          <div className="flex items-center gap-1.5">
            {article.tickers.slice(0, 6).map((sym) => (
              <div
                key={sym}
                className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5"
              >
                <TickerLogo size={14} symbol={sym} />
                <span className="text-xs font-medium tabular-nums">{sym}</span>
              </div>
            ))}
          </div>
        ) : null}
      </header>

      {article.imageUrl ? (
        <div className="relative aspect-[16/9] w-full max-w-sm overflow-hidden rounded-xl bg-muted">
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            loading="lazy"
            src={article.imageUrl}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 text-sm leading-relaxed text-foreground">
        {article.summary ? (
          <p className="text-base font-medium text-foreground">{article.summary}</p>
        ) : null}
        {article.body ? <p className="text-muted-foreground">{article.body}</p> : null}
        {article.bodyExtra.map((paragraph, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <p className="text-muted-foreground" key={i}>
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
