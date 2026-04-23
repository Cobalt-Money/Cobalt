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
import { BankIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

export interface ConnectAccountEmptyProps {
  className?: string;
  ctaLabel?: string;
  description?: ReactNode;
  icon?: ReactNode;
  onConnect?: () => void;
  title?: ReactNode;
}

/**
 * Shared empty state for account-gated surfaces. Renders the shadcn `Empty`
 * primitive with a "Connect account" CTA when `onConnect` is provided.
 */
export function ConnectAccountEmpty({
  className,
  ctaLabel = "Connect account",
  description = "Link a bank or brokerage account to see your data here.",
  icon,
  onConnect,
  title = "Connect an account to get started",
}: ConnectAccountEmptyProps) {
  return (
    <Empty className={cn("min-h-[280px] rounded-3xl", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {icon ?? <HugeiconsIcon icon={BankIcon} strokeWidth={1.5} />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {onConnect ? (
        <EmptyContent>
          <Button onClick={onConnect} type="button">
            {ctaLabel}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
