import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

import type { CategoryPrimaryGlyph } from "./category-primary-icons";

function isImageGlyph(
  icon: CategoryPrimaryGlyph
): icon is { kind: "image"; src: string; srcDark?: string } {
  return (
    typeof icon === "object" &&
    icon !== null &&
    "kind" in icon &&
    icon.kind === "image"
  );
}

const baseImageGlyphClass = "shrink-0 object-contain opacity-80";

/** Primary category glyph (Hugeicons or static vector) — muted, no colored tile. */
export function CategoryIcon({
  icon,
  sizeClassName = "size-6",
}: {
  icon: CategoryPrimaryGlyph;
  /** Override Tailwind size class (default `size-6`). */
  sizeClassName?: string;
}) {
  const imageGlyphClass = `${sizeClassName} ${baseImageGlyphClass}`;
  if (isImageGlyph(icon)) {
    if (icon.srcDark) {
      return (
        <span className="inline-flex shrink-0">
          <img
            alt=""
            aria-hidden
            className={`${imageGlyphClass} dark:hidden`}
            decoding="async"
            src={icon.src}
          />
          <img
            alt=""
            aria-hidden
            className={`${imageGlyphClass} hidden dark:block`}
            decoding="async"
            src={icon.srcDark}
          />
        </span>
      );
    }

    return (
      <img
        alt=""
        aria-hidden
        className={imageGlyphClass}
        decoding="async"
        src={icon.src}
      />
    );
  }

  return (
    <HugeiconsIcon
      aria-hidden
      className={`text-muted-foreground shrink-0 ${sizeClassName} [&_svg]:block`}
      icon={icon as IconSvgElement}
      strokeWidth={2}
    />
  );
}
