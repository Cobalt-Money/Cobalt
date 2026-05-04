import { cn } from "@cobalt-web/ui/lib/utils";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { TagColor } from "./palette";
import { TAG_COLOR_HEX } from "./palette";

interface TagChipProps {
  color: TagColor;
  name: string;
  size?: "sm" | "md";
  onRemove?: () => void;
  className?: string;
}

export function TagChip({
  className,
  color,
  name,
  onRemove,
  size = "md",
}: TagChipProps) {
  const hex = TAG_COLOR_HEX[color];
  const sizeClasses =
    size === "sm" ? "h-5 gap-1 px-1.5 text-xs" : "h-6 gap-1.5 px-2 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border font-medium",
        "border-transparent text-foreground",
        sizeClasses,
        className
      )}
      style={{
        backgroundColor: `${hex}1F`,
        borderColor: `${hex}40`,
        color: hex,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: hex }}
      />
      <span className="min-w-0 truncate">{name}</span>
      {onRemove ? (
        <button
          aria-label={`Remove ${name}`}
          className="ml-0.5 inline-flex size-3.5 shrink-0 items-center justify-center rounded-full opacity-70 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          <HugeiconsIcon className="size-3" icon={Cancel01Icon} />
        </button>
      ) : null}
    </span>
  );
}
