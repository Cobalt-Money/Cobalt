import { Shimmer } from "@cobalt-web/ui/components/ai-elements/shimmer";

import { getHostDisplay } from "../citation/citation-component";
import { ToolErrorCard } from "../shared";
import type { ToolRendererContext } from "../types";

interface WebSearchInvocation {
  type: "tool-webSearch";
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: { results?: { url: string }[] };
  errorText?: string;
}

export function WebSearchToolRenderer({
  invocation: part,
  context,
}: {
  invocation: WebSearchInvocation;
  context: ToolRendererContext;
}) {
  if (part.state === "input-available" || part.state === "input-streaming") {
    return (
      <div className="py-2">
        <Shimmer>Searching the web...</Shimmer>
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <ToolErrorCard
        context={context}
        errorText={part.errorText}
        suffix="web-search-error"
        title="Web search failed"
      />
    );
  }

  if (part.state === "output-available") {
    const resultUrls = part.output?.results?.map((r) => r.url) ?? [];
    const seen = new Set<string>();
    const uniqueHosts: { host: string; faviconSrc: string }[] = [];
    for (const u of resultUrls) {
      const h = getHostDisplay(u);
      if (!seen.has(h)) {
        seen.add(h);
        uniqueHosts.push({
          faviconSrc: `https://www.google.com/s2/favicons?domain=${h}&sz=32`,
          host: h,
        });
      }
    }
    return (
      <div className="py-2 flex items-center gap-2 text-sm text-muted-foreground">
        <span>Searched the web</span>
        {uniqueHosts.map(({ host, faviconSrc }) => (
          <img
            key={host}
            alt={host}
            className="size-3.5 rounded-sm"
            height={14}
            src={faviconSrc}
            title={host}
            width={14}
          />
        ))}
      </div>
    );
  }

  return null;
}
