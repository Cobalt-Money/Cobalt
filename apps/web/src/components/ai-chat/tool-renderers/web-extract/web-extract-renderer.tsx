import { Shimmer } from "@cobalt-web/ui/components/ai-elements/shimmer";

import { getHostDisplay, getSiteName } from "../citation/citation-component";
import { ToolErrorCard } from "../shared";
import type { ToolRendererContext } from "../types";

interface WebExtractInvocation {
  type: "tool-webExtract";
  toolCallId: string;
  state: string;
  input?: { urls?: string[] };
  output?: unknown;
  errorText?: string;
}

export function WebExtractToolRenderer({
  invocation: part,
  context,
}: {
  invocation: WebExtractInvocation;
  context: ToolRendererContext;
}) {
  const firstUrl = part.input?.urls?.[0];
  const host = firstUrl ? getHostDisplay(firstUrl) : "";
  const faviconSrc = firstUrl
    ? `https://www.google.com/s2/favicons?domain=${host}&sz=32`
    : "";
  const siteName = firstUrl ? getSiteName(firstUrl) : "";

  if (part.state === "input-available" || part.state === "input-streaming") {
    return (
      <div className="py-2 flex items-center gap-2">
        <Shimmer>Reading article</Shimmer>
        {firstUrl ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <img
              alt=""
              className="size-3.5 rounded-sm"
              height={14}
              src={faviconSrc}
              width={14}
            />
            {siteName}
          </span>
        ) : null}
      </div>
    );
  }

  if (part.state === "output-error") {
    return (
      <ToolErrorCard
        context={context}
        errorText={part.errorText}
        suffix="web-extract-error"
        title="Page extraction failed"
      />
    );
  }

  if (!firstUrl) {
    return null;
  }

  return (
    <div className="py-2 flex items-center gap-2 text-sm text-muted-foreground">
      <span>Read article</span>
      <img
        alt=""
        className="size-3.5 rounded-sm"
        height={14}
        src={faviconSrc}
        width={14}
      />
      <span>{siteName}</span>
    </div>
  );
}
