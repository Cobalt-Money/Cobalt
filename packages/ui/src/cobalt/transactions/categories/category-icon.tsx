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

const imageGlyphClass = "size-6 shrink-0 object-contain opacity-80";

/** Primary category glyph (Hugeicons or static vector) — muted, no colored tile. */
export function CategoryIcon({ icon }: { icon: CategoryPrimaryGlyph }) {
  if (isImageGlyph(icon)) {
    if (icon.srcDark) {
      return (
        <span className="inline-flex shrink-0">
          <img
            alt=""
            aria-hidden
            className={`${imageGlyphClass} dark:hidden`}
            decoding="async"
            height={24}
            src={icon.src}
            width={24}
          />
          <img
            alt=""
            aria-hidden
            className={`${imageGlyphClass} hidden dark:block`}
            decoding="async"
            height={24}
            src={icon.srcDark}
            width={24}
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
        height={24}
        src={icon.src}
        width={24}
      />
    );
  }

  return (
    <HugeiconsIcon
      aria-hidden
      className="text-muted-foreground size-6 shrink-0 [&_svg]:block"
      icon={icon as IconSvgElement}
      strokeWidth={2}
    />
  );
}
