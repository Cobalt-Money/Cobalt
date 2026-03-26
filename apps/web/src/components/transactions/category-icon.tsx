import { cn } from "@cobalt-web/ui/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";

import type { PrimaryCategoryKey } from "./category-primary-icons";

/**
 * Rounded tint behind category icons (Hugeicons two-tone only applies when SVG paths
 * include opacity; most glyphs are single-color stroke). White strokes read as “glyph on
 * colored tile” — e.g. income = green tile + white dollar/circle strokes.
 */
const CATEGORY_ICON_TINT: Record<PrimaryCategoryKey, string> = {
  BANK_FEES: "bg-amber-600 dark:bg-amber-700",
  ENTERTAINMENT: "bg-violet-600 dark:bg-violet-700",
  FOOD_AND_DRINK: "bg-orange-600 dark:bg-orange-700",
  GENERAL_MERCHANDISE: "bg-pink-600 dark:bg-pink-700",
  GENERAL_SERVICES: "bg-slate-600 dark:bg-slate-700",
  GOVERNMENT_AND_NON_PROFIT: "bg-blue-700 dark:bg-blue-800",
  HOME_IMPROVEMENT: "bg-lime-600 dark:bg-lime-700",
  INCOME: "bg-emerald-600 dark:bg-emerald-700",
  LOAN_PAYMENTS: "bg-cyan-700 dark:bg-cyan-800",
  MEDICAL: "bg-rose-600 dark:bg-rose-700",
  PERSONAL_CARE: "bg-fuchsia-600 dark:bg-fuchsia-700",
  RENT_AND_UTILITIES: "bg-sky-600 dark:bg-sky-700",
  TRANSFER_IN: "bg-green-600 dark:bg-green-700",
  TRANSFER_OUT: "bg-amber-700 dark:bg-amber-800",
  TRANSPORTATION: "bg-indigo-600 dark:bg-indigo-700",
  TRAVEL: "bg-cyan-600 dark:bg-cyan-700",
};

export function CategoryIcon({
  categoryPrimary,
  icon,
}: {
  categoryPrimary: string;
  icon: IconSvgElement;
}) {
  const tint =
    CATEGORY_ICON_TINT[categoryPrimary as PrimaryCategoryKey] ?? null;
  const known = Boolean(tint);

  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-md",
        known ? cn(tint, "text-white") : "bg-muted text-muted-foreground"
      )}
    >
      <HugeiconsIcon
        aria-hidden
        className="size-3.5 [&_svg]:block"
        icon={icon}
        strokeWidth={2}
      />
    </span>
  );
}
