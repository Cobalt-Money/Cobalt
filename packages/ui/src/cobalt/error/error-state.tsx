import { Button } from "@cobalt-web/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@cobalt-web/ui/components/empty";
import { cn } from "@cobalt-web/ui/lib/utils";
import { Icon } from "@cobalt-web/ui/components/icon";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";

export interface ErrorStateProps {
  className?: string;
  ctaLabel?: string;
  description?: ReactNode;
  /** Raw technical detail (e.g. `error.message`), rendered in muted mono text. */
  detail?: string;
  onRetry?: () => void;
  retrying?: boolean;
  title?: ReactNode;
}

/**
 * Error counterpart to the `Empty` primitives — inline failure state for a
 * section whose query or load failed, with optional retry.
 */
export function ErrorState({
  className,
  ctaLabel = "Try again",
  description = "This is usually temporary — try again in a moment.",
  detail,
  onRetry,
  retrying = false,
  title = "Couldn’t load this",
}: ErrorStateProps) {
  return (
    <Empty className={cn("min-h-[280px] rounded-3xl", className)} role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon icon={Alert02Icon} size="lg" strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        {detail ? (
          <p className="font-mono text-muted-foreground/70 text-xs break-all">{detail}</p>
        ) : null}
      </EmptyHeader>
      {onRetry ? (
        <EmptyContent>
          <Button disabled={retrying} onClick={onRetry} type="button" variant="outline">
            {retrying ? "Retrying…" : ctaLabel}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
