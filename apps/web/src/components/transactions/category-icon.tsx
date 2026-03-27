import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

/** Primary category glyph (Hugeicons) — muted stroke, no colored tile. */
export function CategoryIcon({ icon }: { icon: IconSvgElement }) {
  return (
    <HugeiconsIcon
      aria-hidden
      className="text-muted-foreground size-4 shrink-0 [&_svg]:block"
      icon={icon}
      strokeWidth={2}
    />
  );
}
