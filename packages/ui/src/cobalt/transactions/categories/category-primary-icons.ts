import { CATEGORY_MAPPING, formatCategoryName } from "@cobalt-web/server-data/categories/labels";
import type { CategoryData } from "@cobalt-web/server-data/categories/labels";
import { QuestionIcon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type { CategoryData } from "@cobalt-web/server-data/categories/labels";
export {
  getDetailedCategoryDisplayName,
  getPrimaryCategoryLabel,
} from "@cobalt-web/server-data/categories/labels";

const V = "?v=2";
const BANK_FEES_ICON_SRC = `/assets/vectors/card.svg${V}`;
const FOOD_AND_DRINK_ICON_SRC = `/assets/vectors/cheese.svg${V}`;
const INCOME_ICON_SRC = `/assets/vectors/moneybag.svg${V}`;
const TRAVEL_ICON_SRC = `/assets/vectors/travel.svg${V}`;
const GENERAL_MERCHANDISE_ICON_SRC = `/assets/vectors/shopping.svg${V}`;
const TRANSPORTATION_ICON_SRC = `/assets/vectors/car.svg${V}`;
const ENTERTAINMENT_ICON_SRC = `/assets/vectors/popcorn.svg${V}`;
const TRANSFER_IN_ICON_SRC = `/assets/vectors/transfer-in.svg${V}`;
const TRANSFER_OUT_ICON_SRC = `/assets/vectors/transfer-out.svg${V}`;
const RENT_AND_UTILITIES_ICON_SRC = `/assets/vectors/building.svg${V}`;
const GENERAL_SERVICES_ICON_SRC = `/assets/vectors/settings.svg${V}`;
const MEDICAL_ICON_SRC = `/assets/vectors/hospital.svg${V}`;
const HOME_IMPROVEMENT_ICON_SRC = `/assets/vectors/home.svg${V}`;
const LOAN_PAYMENTS_ICON_SRC = `/assets/vectors/payment.svg${V}`;
const GOVERNMENT_AND_NON_PROFIT_ICON_SRC = `/assets/vectors/government.svg${V}`;
const PERSONAL_CARE_ICON_SRC = `/assets/vectors/health.svg${V}`;

/** Hugeicons glyph, static vector, or user-chosen emoji char. */
export type CategoryPrimaryGlyph =
  | IconSvgElement
  | { kind: "image"; src: string; srcDark?: string }
  | { kind: "emoji"; char: string };

/** Plaid primary category → Hugeicons glyph (category column). */
export const PRIMARY_CATEGORY_ICON = {
  BANK_FEES: { kind: "image", src: BANK_FEES_ICON_SRC },
  ENTERTAINMENT: { kind: "image", src: ENTERTAINMENT_ICON_SRC },
  FOOD_AND_DRINK: { kind: "image", src: FOOD_AND_DRINK_ICON_SRC },
  GENERAL_MERCHANDISE: { kind: "image", src: GENERAL_MERCHANDISE_ICON_SRC },
  GENERAL_SERVICES: { kind: "image", src: GENERAL_SERVICES_ICON_SRC },
  GOVERNMENT_AND_NON_PROFIT: {
    kind: "image",
    src: GOVERNMENT_AND_NON_PROFIT_ICON_SRC,
  },
  HOME_IMPROVEMENT: { kind: "image", src: HOME_IMPROVEMENT_ICON_SRC },
  INCOME: { kind: "image", src: INCOME_ICON_SRC },
  LOAN_PAYMENTS: { kind: "image", src: LOAN_PAYMENTS_ICON_SRC },
  MEDICAL: { kind: "image", src: MEDICAL_ICON_SRC },
  PERSONAL_CARE: { kind: "image", src: PERSONAL_CARE_ICON_SRC },
  RENT_AND_UTILITIES: { kind: "image", src: RENT_AND_UTILITIES_ICON_SRC },
  TRANSFER_IN: { kind: "image", src: TRANSFER_IN_ICON_SRC },
  TRANSFER_OUT: { kind: "image", src: TRANSFER_OUT_ICON_SRC },
  TRANSPORTATION: { kind: "image", src: TRANSPORTATION_ICON_SRC },
  TRAVEL: { kind: "image", src: TRAVEL_ICON_SRC },
} as const satisfies Record<string, CategoryPrimaryGlyph>;

export type PrimaryCategoryKey = keyof typeof PRIMARY_CATEGORY_ICON;

export const UNKNOWN_CATEGORY_ICON = QuestionIcon;

export function getCategoryDisplayConfig(category: CategoryData | null): {
  icon: CategoryPrimaryGlyph;
  label: string;
} {
  if (!category?.primary) {
    return { icon: UNKNOWN_CATEGORY_ICON, label: "Unknown" };
  }

  const key = category.primary as PrimaryCategoryKey;
  const mapped = CATEGORY_MAPPING[key as keyof typeof CATEGORY_MAPPING];
  if (mapped) {
    return {
      icon: PRIMARY_CATEGORY_ICON[key],
      label: mapped.label,
    };
  }

  return {
    icon: UNKNOWN_CATEGORY_ICON,
    label: formatCategoryName(category.primary),
  };
}
