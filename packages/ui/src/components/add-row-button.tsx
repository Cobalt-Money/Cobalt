import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "../lib/utils";

export interface AddRowButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Ghost button shaped like a list row: plus inside a dashed circle, then label.
 * Used as the trailing "create new" affordance in management lists (tags,
 * categories, etc).
 */
export function AddRowButton({ label, onClick, className, ariaLabel }: AddRowButtonProps) {
  return (
    <button
      aria-label={ariaLabel ?? label}
      className={cn(
        "flex items-center gap-3 rounded-lg px-2 py-2 text-left text-base text-muted-foreground transition hover:bg-muted/40 hover:text-foreground",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex size-6 items-center justify-center rounded-full border border-border border-dashed">
        <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
      </span>
      {label}
    </button>
  );
}
