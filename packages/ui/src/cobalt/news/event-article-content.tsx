import { cn } from "@cobalt-web/ui/lib/utils";
import type { ComponentProps } from "react";
import { useMemo } from "react";
import { Streamdown } from "streamdown";

export interface EventArticleSource {
  readonly id: string;
  readonly title: string;
  readonly newsUrl: string;
  readonly sourceName?: string | null;
}

interface Props {
  readonly markdown: string;
  readonly sources: readonly EventArticleSource[];
  readonly className?: string;
}

const MAX_INLINE_CHIPS = 1;

const CITE_SINGLE_RE = /^cite:(\d+)$/;
const CITE_GROUP_RE = /^cite-group:([\d,]+)$/;

interface MdNode {
  type: string;
  url?: string;
  children?: MdNode[];
  value?: string;
}

function citeIndex(node: MdNode | undefined): number | null {
  if (!node || node.type !== "link" || typeof node.url !== "string") {
    return null;
  }
  const m = CITE_SINGLE_RE.exec(node.url);
  if (!m || m[1] === undefined) {
    return null;
  }
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isWhitespaceText(node: MdNode | undefined): boolean {
  return Boolean(
    node && node.type === "text" && typeof node.value === "string" && /^\s*$/.test(node.value),
  );
}

function remarkGroupCitations() {
  function walk(node: MdNode): void {
    if (!Array.isArray(node.children)) {
      return;
    }
    if (node.type === "paragraph") {
      const out: MdNode[] = [];
      const kids = node.children;
      let i = 0;
      while (i < kids.length) {
        const cur = kids[i];
        if (!cur) {
          i += 1;
          continue;
        }
        const idx = citeIndex(cur);
        if (idx === null) {
          out.push(cur);
          i += 1;
          continue;
        }
        const indices: number[] = [idx];
        let j = i + 1;
        while (j < kids.length) {
          const next = kids[j];
          if (isWhitespaceText(next)) {
            const after = kids[j + 1];
            if (after && citeIndex(after) !== null) {
              j += 1;
              continue;
            }
            break;
          }
          const ni = citeIndex(next);
          if (ni === null) {
            break;
          }
          indices.push(ni);
          j += 1;
        }
        out.push({
          children: [{ type: "text", value: "" }],
          type: "link",
          url: `cite-group:${indices.join(",")}`,
        });
        i = j;
      }
      node.children = out;
    }
    for (const c of node.children) {
      walk(c);
    }
  }
  return (tree: MdNode) => {
    walk(tree);
  };
}

function citeUrlTransform(url: string): string {
  return url;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function faviconUrl(url: string): string | null {
  const host = hostnameOf(url);
  if (!host) {
    return null;
  }
  return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
}

function chipLabel(source: EventArticleSource): string {
  if (source.sourceName && source.sourceName.trim()) {
    return source.sourceName.trim().toLowerCase();
  }
  const host = hostnameOf(source.newsUrl);
  if (host) {
    const parts = host.split(".");
    const root = parts.length >= 2 ? parts.at(-2) : host;
    return (root ?? host).toLowerCase();
  }
  return "source";
}

function CiteChip({
  indices,
  sources,
}: {
  indices: number[];
  sources: readonly EventArticleSource[];
}) {
  const resolved: EventArticleSource[] = [];
  for (const i of indices) {
    const s = sources[i - 1];
    if (s) {
      resolved.push(s);
    }
  }

  const [primary] = resolved;
  if (!primary) {
    return null;
  }

  const overflow = resolved.length - MAX_INLINE_CHIPS;
  const fav = faviconUrl(primary.newsUrl);

  return (
    <a
      className={cn(
        "ml-1 inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 align-middle text-[11px] text-muted-foreground no-underline transition hover:bg-muted/70 hover:text-foreground",
      )}
      href={primary.newsUrl}
      rel="noreferrer noopener"
      target="_blank"
      title={resolved.map((s) => s.title).join("\n")}
    >
      {fav ? <img alt="" className="size-3 rounded-sm" loading="lazy" src={fav} /> : null}
      <span className="font-medium">{chipLabel(primary)}</span>
      {overflow > 0 ? <span className="opacity-70">+{overflow}</span> : null}
    </a>
  );
}

export function EventArticleContent({ markdown, sources, className }: Props) {
  const remarkPlugins = useMemo(() => [remarkGroupCitations], []);

  const components = useMemo(
    () => ({
      a: ({ href, children, ...rest }: ComponentProps<"a"> & { href?: string }) => {
        if (typeof href === "string") {
          const groupMatch = CITE_GROUP_RE.exec(href);
          if (groupMatch && groupMatch[1] !== undefined) {
            const indices = groupMatch[1]
              .split(",")
              .map((n) => Number.parseInt(n, 10))
              .filter((n) => Number.isFinite(n) && n > 0);
            return <CiteChip indices={indices} sources={sources} />;
          }
          const singleMatch = CITE_SINGLE_RE.exec(href);
          if (singleMatch && singleMatch[1] !== undefined) {
            return <CiteChip indices={[Number.parseInt(singleMatch[1], 10)]} sources={sources} />;
          }
        }
        return (
          <a href={href} rel="noreferrer noopener" target="_blank" {...rest}>
            {children}
          </a>
        );
      },
    }),
    [sources],
  );

  return (
    <Streamdown
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "[&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_p]:my-3 [&_p]:leading-relaxed [&_p]:text-muted-foreground",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      components={components}
      remarkPlugins={remarkPlugins}
      urlTransform={citeUrlTransform}
    >
      {markdown}
    </Streamdown>
  );
}
