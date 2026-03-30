import { QuestionIcon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

const BANK_FEES_ICON_SRC = "/assets/vectors/card.svg";
const FOOD_AND_DRINK_ICON_SRC = "/assets/vectors/cheese.svg";
const INCOME_ICON_SRC = "/assets/vectors/moneybag.svg";
const TRAVEL_ICON_SRC = "/assets/vectors/travel.svg";
const GENERAL_MERCHANDISE_ICON_SRC = "/assets/vectors/shopping.svg";
const TRANSPORTATION_ICON_SRC = "/assets/vectors/car.svg";
const ENTERTAINMENT_ICON_SRC = "/assets/vectors/popcorn.svg";
const TRANSFER_IN_ICON_SRC = "/assets/vectors/transfer-in.svg";
const TRANSFER_OUT_ICON_SRC = "/assets/vectors/transfer-out.svg";
const RENT_AND_UTILITIES_ICON_SRC = "/assets/vectors/building.svg";
const GENERAL_SERVICES_ICON_SRC = "/assets/vectors/settings.svg";
const MEDICAL_ICON_SRC = "/assets/vectors/hospital.svg";
const HOME_IMPROVEMENT_ICON_SRC = "/assets/vectors/home.svg";
const LOAN_PAYMENTS_ICON_SRC = "/assets/vectors/payment.svg";
const LOAN_PAYMENTS_ICON_SRC_DARK = "/assets/vectors/payment-dark.svg";
const GOVERNMENT_AND_NON_PROFIT_ICON_SRC = "/assets/vectors/government.svg";
const PERSONAL_CARE_ICON_SRC = "/assets/vectors/health.svg";

/** Hugeicons glyph or static vector under `public/assets/vectors/`. */
export type CategoryPrimaryGlyph =
  | IconSvgElement
  | { kind: "image"; src: string; srcDark?: string };

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
  LOAN_PAYMENTS: {
    kind: "image",
    src: LOAN_PAYMENTS_ICON_SRC,
    srcDark: LOAN_PAYMENTS_ICON_SRC_DARK,
  },
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
