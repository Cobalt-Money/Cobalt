/**
 * SRI-311: System category icon registry.
 *
 * Maps `category.systemKey` → static SVG under `public/assets/vectors/categories/{group}/`.
 * User-custom cats (`systemKey IS NULL`) store an emoji char in `category.iconKey`;
 * `resolveCategoryIcon` detects emoji vs registry key at render time.
 *
 * Group folders mirror Plaid PFC primary categories.
 */

import type { CategoryPrimaryGlyph } from "./category-primary-icons";

const V = "?v=1";

const buildSrc = (groupKey: string, systemKey: string): string =>
  `/assets/vectors/categories/${groupKey}/${systemKey}.svg${V}`;

export type CategorySystemKey =
  // food_and_drink
  | "alcohol_bars"
  | "coffee_shop"
  | "food_delivery"
  | "groceries"
  | "restaurants"
  | "snacks"
  // transportation
  | "auto_maintenance"
  | "bike_scooter"
  | "gas_fuel"
  | "parking"
  | "public_transit"
  | "taxi"
  | "toll"
  // rent_and_utilities
  | "energy"
  | "internet"
  | "phone"
  | "rent_mortgage"
  | "waste"
  | "water"
  // home_improvement
  | "furniture"
  | "hardware"
  | "home_maintenance"
  | "security"
  // general_merchandise
  | "clothing"
  | "convenience_store"
  | "electronics"
  | "gift"
  | "shopping"
  // medical
  | "dental"
  | "eye_doctor"
  | "nursing"
  | "pharmacy"
  | "primary"
  | "vet"
  // personal_care
  | "fitness"
  | "hair_beauty"
  | "laundry"
  | "vape"
  // entertainment
  | "books_media"
  | "event"
  | "gambling"
  | "movies"
  | "music"
  | "sporting_goods"
  | "streaming"
  | "video_games"
  // travel
  | "flights"
  | "hotels"
  | "rentals"
  // general_services
  | "childcare"
  | "education"
  | "financial_service"
  | "insurance"
  | "legal"
  | "office_supplies"
  | "pets"
  | "shipping"
  | "storage"
  // government_and_non_profit
  | "donations"
  | "government_fee"
  | "taxes"
  // bank_fees
  | "atm"
  | "foreign_transaction"
  | "insufficient"
  | "interest"
  | "overdraft"
  // transfers
  | "account_transfer"
  | "cash_advance"
  | "deposit"
  | "investment_transfer"
  | "savings_transfer"
  | "withdrawal"
  // income
  | "bonus"
  | "cashback"
  | "dividend"
  | "freelance"
  | "gift_received"
  | "interest_received"
  | "paycheck"
  | "pension"
  | "tax_returns"
  | "unemployment"
  // loan_payments
  | "car_payment"
  | "credit_card_payment"
  | "mortgage_payment"
  | "other_loan"
  | "student_loan"
  // other
  | "uncategorized";

/** Per-systemKey SVG src. Filename = systemKey, folder = group systemKey. */
export const CATEGORY_SYSTEM_ICON_SRC: Record<CategorySystemKey, string> = {
  account_transfer: buildSrc("transfers", "account_transfer"),
  alcohol_bars: buildSrc("food_and_drink", "alcohol_bars"),
  atm: buildSrc("bank_fees", "atm"),
  auto_maintenance: buildSrc("transportation", "auto_maintenance"),
  bike_scooter: buildSrc("transportation", "bike_scooter"),
  bonus: buildSrc("income", "bonus"),
  books_media: buildSrc("entertainment", "books_media"),
  car_payment: buildSrc("loan_payments", "car_payment"),
  cash_advance: buildSrc("transfers", "cash_advance"),
  cashback: buildSrc("income", "cashback"),
  childcare: buildSrc("general_services", "childcare"),
  clothing: buildSrc("general_merchandise", "clothing"),
  coffee_shop: buildSrc("food_and_drink", "coffee_shop"),
  convenience_store: buildSrc("general_merchandise", "convenience_store"),
  credit_card_payment: buildSrc("loan_payments", "credit_card_payment"),
  dental: buildSrc("medical", "dental"),
  deposit: buildSrc("transfers", "deposit"),
  dividend: buildSrc("income", "dividend"),
  donations: buildSrc("government_and_non_profit", "donations"),
  education: buildSrc("general_services", "education"),
  electronics: buildSrc("general_merchandise", "electronics"),
  energy: buildSrc("rent_and_utilities", "energy"),
  event: buildSrc("entertainment", "event"),
  eye_doctor: buildSrc("medical", "eye_doctor"),
  financial_service: buildSrc("general_services", "financial_service"),
  fitness: buildSrc("personal_care", "fitness"),
  flights: buildSrc("travel", "flights"),
  food_delivery: buildSrc("food_and_drink", "food_delivery"),
  foreign_transaction: buildSrc("bank_fees", "foreign_transaction"),
  freelance: buildSrc("income", "freelance"),
  furniture: buildSrc("home_improvement", "furniture"),
  gambling: buildSrc("entertainment", "gambling"),
  gas_fuel: buildSrc("transportation", "gas_fuel"),
  gift: buildSrc("general_merchandise", "gift"),
  gift_received: buildSrc("income", "gift_received"),
  government_fee: buildSrc("government_and_non_profit", "government_fee"),
  groceries: buildSrc("food_and_drink", "groceries"),
  hair_beauty: buildSrc("personal_care", "hair_beauty"),
  hardware: buildSrc("home_improvement", "hardware"),
  home_maintenance: buildSrc("home_improvement", "home_maintenance"),
  hotels: buildSrc("travel", "hotels"),
  insufficient: buildSrc("bank_fees", "insufficient"),
  insurance: buildSrc("general_services", "insurance"),
  interest: buildSrc("bank_fees", "interest"),
  interest_received: buildSrc("income", "interest_received"),
  internet: buildSrc("rent_and_utilities", "internet"),
  investment_transfer: buildSrc("transfers", "investment_transfer"),
  laundry: buildSrc("personal_care", "laundry"),
  legal: buildSrc("general_services", "legal"),
  mortgage_payment: buildSrc("rent_and_utilities", "rent_mortgage"),
  movies: buildSrc("entertainment", "movies"),
  music: buildSrc("entertainment", "music"),
  nursing: buildSrc("medical", "nursing"),
  office_supplies: buildSrc("general_services", "office_supplies"),
  other_loan: buildSrc("loan_payments", "other_loan"),
  overdraft: buildSrc("bank_fees", "overdraft"),
  parking: buildSrc("transportation", "parking"),
  paycheck: buildSrc("income", "paycheck"),
  pension: buildSrc("income", "pension"),
  pets: buildSrc("general_services", "pets"),
  pharmacy: buildSrc("medical", "pharmacy"),
  phone: buildSrc("rent_and_utilities", "phone"),
  primary: buildSrc("medical", "primary"),
  public_transit: buildSrc("transportation", "public_transit"),
  rent_mortgage: buildSrc("rent_and_utilities", "rent_mortgage"),
  rentals: buildSrc("travel", "rentals"),
  restaurants: buildSrc("food_and_drink", "restaurants"),
  savings_transfer: buildSrc("transfers", "savings_transfer"),
  security: buildSrc("home_improvement", "security"),
  shipping: buildSrc("general_services", "shipping"),
  shopping: buildSrc("general_merchandise", "shopping"),
  snacks: buildSrc("food_and_drink", "snacks"),
  sporting_goods: buildSrc("entertainment", "sporting_goods"),
  storage: buildSrc("general_services", "storage"),
  streaming: buildSrc("entertainment", "streaming"),
  student_loan: buildSrc("loan_payments", "student_loan"),
  tax_returns: buildSrc("income", "tax_returns"),
  taxes: buildSrc("government_and_non_profit", "taxes"),
  taxi: buildSrc("transportation", "taxi"),
  toll: buildSrc("transportation", "toll"),
  uncategorized: buildSrc("other", "uncategorized"),
  unemployment: buildSrc("income", "unemployment"),
  vape: buildSrc("personal_care", "vape"),
  vet: buildSrc("medical", "vet"),
  video_games: buildSrc("entertainment", "video_games"),
  waste: buildSrc("rent_and_utilities", "waste"),
  water: buildSrc("rent_and_utilities", "water"),
  withdrawal: buildSrc("transfers", "withdrawal"),
};

/** Group systemKey union (mirrors Plaid PFC primaries + `other`). */
export type CategoryGroupKey =
  | "food_and_drink"
  | "transportation"
  | "rent_and_utilities"
  | "home_improvement"
  | "general_merchandise"
  | "medical"
  | "personal_care"
  | "entertainment"
  | "travel"
  | "general_services"
  | "bank_fees"
  | "loan_payments"
  | "government_and_non_profit"
  | "transfers"
  | "income"
  | "other";

/**
 * Group icon — reuses a representative cat icon from each group.
 * Used for group filter UI + `other_*` cat fallback.
 */
export const GROUP_ICON_SRC: Record<CategoryGroupKey, string> = {
  bank_fees: CATEGORY_SYSTEM_ICON_SRC.atm,
  entertainment: CATEGORY_SYSTEM_ICON_SRC.movies,
  food_and_drink: CATEGORY_SYSTEM_ICON_SRC.groceries,
  general_merchandise: CATEGORY_SYSTEM_ICON_SRC.shopping,
  general_services: CATEGORY_SYSTEM_ICON_SRC.office_supplies,
  government_and_non_profit: CATEGORY_SYSTEM_ICON_SRC.government_fee,
  home_improvement: CATEGORY_SYSTEM_ICON_SRC.home_maintenance,
  income: CATEGORY_SYSTEM_ICON_SRC.paycheck,
  loan_payments: CATEGORY_SYSTEM_ICON_SRC.credit_card_payment,
  medical: CATEGORY_SYSTEM_ICON_SRC.primary,
  other: CATEGORY_SYSTEM_ICON_SRC.uncategorized,
  personal_care: CATEGORY_SYSTEM_ICON_SRC.fitness,
  rent_and_utilities: CATEGORY_SYSTEM_ICON_SRC.rent_mortgage,
  transfers: CATEGORY_SYSTEM_ICON_SRC.deposit,
  transportation: CATEGORY_SYSTEM_ICON_SRC.public_transit,
  travel: CATEGORY_SYSTEM_ICON_SRC.flights,
};

/** `other_*` cat → parent group lookup for icon fallback. */
const OTHER_CAT_TO_GROUP: Record<string, CategoryGroupKey> = {
  other_bank_fees: "bank_fees",
  other_entertainment: "entertainment",
  other_government: "government_and_non_profit",
  other_home: "home_improvement",
  other_income: "income",
  other_medical: "medical",
  other_personal_care: "personal_care",
  other_services: "general_services",
  other_transfer: "transfers",
  other_transportation: "transportation",
  other_travel: "travel",
  other_utilities: "rent_and_utilities",
};

/** Conservative emoji detector — matches surrogate pairs / pictographic chars. */
const EMOJI_PATTERN =
  /^(\p{Extended_Pictographic}|\p{Emoji_Presentation})(‍\p{Extended_Pictographic})*️?$/u;

export const isEmojiIconKey = (iconKey: string): boolean =>
  EMOJI_PATTERN.test(iconKey);

/**
 * Resolve `category.iconKey` to a render target.
 *
 * - Curated systemKey → image glyph
 * - `other_*` cat → parent group icon
 * - Emoji char → emoji glyph (rendered as text span)
 * - Unknown → undefined; caller falls back to UNKNOWN_CATEGORY_ICON
 */
export function resolveCategoryIcon(
  iconKey: string | null | undefined
): CategoryPrimaryGlyph | { kind: "emoji"; char: string } | undefined {
  if (!iconKey) {
    return undefined;
  }
  if (isEmojiIconKey(iconKey)) {
    return { char: iconKey, kind: "emoji" };
  }
  const src = CATEGORY_SYSTEM_ICON_SRC[iconKey as CategorySystemKey];
  if (src) {
    return { kind: "image", src };
  }
  const fallbackGroup = OTHER_CAT_TO_GROUP[iconKey];
  if (fallbackGroup) {
    return { kind: "image", src: GROUP_ICON_SRC[fallbackGroup] };
  }
  return undefined;
}

/** Lookup icon for a category group (used for group filter UI / pickers). */
export function resolveGroupIcon(
  groupKey: string | null | undefined
): { kind: "image"; src: string } | undefined {
  if (!groupKey) {
    return undefined;
  }
  const src = GROUP_ICON_SRC[groupKey as CategoryGroupKey];
  if (!src) {
    return undefined;
  }
  return { kind: "image", src };
}
