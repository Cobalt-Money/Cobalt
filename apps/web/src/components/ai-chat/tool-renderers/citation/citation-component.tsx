import {
  InlineCitation,
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationCardTrigger,
} from "@cobalt-web/ui/components/ai-elements/inline-citation";
import { memo } from "react";

interface CiteProps {
  url?: string;
  title?: string;
  excerpt?: string;
  children?: React.ReactNode;
  node?: unknown;
}

export function getSiteName(url: string): string {
  try {
    let host = new URL(url).hostname;
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    const parts = host.split(".");
    if (parts.length > 1) {
      parts.pop();
    }
    if (parts.length > 1 && (parts.at(-1)?.length ?? 0) <= 3) {
      parts.pop();
    }
    return parts.join(".");
  } catch {
    return url;
  }
}

export function getHostDisplay(url: string): string {
  try {
    let host = new URL(url).hostname;
    if (host.startsWith("www.")) {
      host = host.slice(4);
    }
    return host;
  } catch {
    return url;
  }
}

export const CitationComponent = memo(function CitationComponent({
  url,
  title,
  excerpt,
}: CiteProps) {
  if (!url) {
    return null;
  }

  const hostDisplay = getHostDisplay(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostDisplay}&sz=32`;

  return (
    <InlineCitation>
      <InlineCitationCard>
        <InlineCitationCardTrigger sources={[url]}>
          <img
            alt=""
            className="size-3.5 rounded-sm"
            height={14}
            src={faviconUrl}
            width={14}
          />
          {getSiteName(url)}
        </InlineCitationCardTrigger>
        <InlineCitationCardBody>
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <img
                alt=""
                className="size-4 rounded-sm"
                height={16}
                src={faviconUrl}
                width={16}
              />
              <span className="text-xs text-muted-foreground">
                {hostDisplay}
              </span>
            </div>
            {title ? (
              <a
                className="block font-medium text-sm leading-snug text-primary hover:underline"
                href={url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {title}
              </a>
            ) : null}
            {excerpt ? (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                {excerpt}
              </p>
            ) : null}
          </div>
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  );
});
