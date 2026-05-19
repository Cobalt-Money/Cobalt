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
import { FilterRemoveIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

export interface NoFilterResultsEmptyProps {
  className?: string;
  ctaLabel?: string;
  description?: ReactNode;
  onClearFilters?: () => void;
  title?: ReactNode;
}

export function NoFilterResultsEmpty({
  className,
  ctaLabel = "Clear filters",
  description = "Try adjusting or clearing your filters to see more transactions.",
  onClearFilters,
  title = "No matching transactions",
}: NoFilterResultsEmptyProps) {
  return (
    <Empty className={cn("min-h-[280px] rounded-3xl", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={FilterRemoveIcon} strokeWidth={1.5} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {onClearFilters ? (
        <EmptyContent>
          <Button onClick={onClearFilters} type="button" variant="outline">
            {ctaLabel}
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
