import { cn } from "@cobalt-web/ui/lib/utils";

import type { TagColor } from "./palette";
import { TagChip } from "./tag-chip";

interface TagListProps {
  tags: { id: string; name: string; color: TagColor }[];
  max?: number;
  size?: "sm" | "md";
  className?: string;
}

/** Inline tag chip row with `+N` overflow. */
export function TagList({
  className,
  max = 3,
  size = "sm",
  tags,
}: TagListProps) {
  if (tags.length === 0) {
    return null;
  }
  const visible = tags.slice(0, max);
  const overflow = tags.length - visible.length;
  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      {visible.map((t) => (
        <TagChip color={t.color} key={t.id} name={t.name} size={size} />
      ))}
      {overflow > 0 ? (
        <span className="shrink-0 text-muted-foreground text-xs">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
