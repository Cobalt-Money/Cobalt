/**
 * SRI-311: System category + group seed data.
 *
 * Inserted per user at signup (better-auth hook) + backfilled into existing users
 * via migration. systemKey = stable internal id; name = user-mutable display.
 *
 * Group icons are registry-only (no schema column); UI resolves via
 * `resolveGroupIcon(groupSystemKey)` from `@cobalt-web/ui`.
 *
 * `iconKey` on cats == `systemKey` (registry lookup). User-custom cats (phase 2)
 * may set `iconKey` to an emoji char.
 *
 * `excludeFromInsights` defaults from ticket:
 * - transfers/* (movement, not spend)
 * - loan_payments/* except mortgage_payment (debt principal isn't expense; mortgage is housing)
 * - income/dividend, income/interest_received (investment yield, mirror of TRANSFERs)
 */

import type { CategoryGroupKey, CategorySystemKey } from "./system-keys";

export interface CategorySeedRow {
  systemKey: CategorySystemKey;
  name: string;
  /** Default exclusion from spend insights. Per-tx override on `transaction.excluded`. */
  excludeFromInsights: boolean;
}

export interface CategoryGroupSeed {
  systemKey: CategoryGroupKey;
  name: string;
  /** Order within the user's group list. */
  order: number;
  /** Cats nested under the group, in display order. */
  categories: CategorySeedRow[];
}

const cat = (
  systemKey: CategorySystemKey,
  name: string,
  excludeFromInsights = false,
): CategorySeedRow => ({ excludeFromInsights, name, systemKey });

export const CATEGORY_GROUP_SEED: CategoryGroupSeed[] = [
  {
    categories: [
      cat("groceries", "Groceries"),
      cat("restaurants", "Restaurants"),
      cat("coffee_shop", "Coffee Shops"),
      cat("alcohol_bars", "Alcohol & Bars"),
      cat("food_delivery", "Food Delivery"),
      cat("snacks", "Snacks"),
    ],
    name: "Food & Drink",
    order: 10,
    systemKey: "food_and_drink",
  },
  {
    categories: [
      cat("public_transit", "Public Transit"),
      cat("taxi", "Rideshare & Taxi"),
      cat("gas_fuel", "Gas & Fuel"),
      cat("parking", "Parking"),
      cat("toll", "Tolls"),
      cat("bike_scooter", "Bikes & Scooters"),
      cat("auto_maintenance", "Auto Maintenance"),
      cat("other_transportation", "Other Transportation"),
    ],
    name: "Transportation",
    order: 20,
    systemKey: "transportation",
  },
  {
    categories: [
      cat("rent_mortgage", "Rent"),
      cat("energy", "Gas & Electric"),
      cat("internet", "Internet & Cable"),
      cat("phone", "Phone"),
      cat("water", "Water"),
      cat("waste", "Waste"),
      cat("other_utilities", "Other Utilities"),
    ],
    name: "Rent & Utilities",
    order: 30,
    systemKey: "rent_and_utilities",
  },
  {
    categories: [
      cat("home_maintenance", "Home Maintenance"),
      cat("furniture", "Furniture"),
      cat("hardware", "Hardware"),
      cat("security", "Security"),
      cat("other_home", "Other Home Improvement"),
    ],
    name: "Home Improvement",
    order: 40,
    systemKey: "home_improvement",
  },
  {
    categories: [
      cat("shopping", "General Shopping"),
      cat("clothing", "Clothing"),
      cat("electronics", "Electronics"),
      cat("convenience_store", "Convenience Store"),
      cat("gift", "Gifts"),
    ],
    name: "Shopping",
    order: 50,
    systemKey: "general_merchandise",
  },
  {
    categories: [
      cat("primary", "Primary Care"),
      cat("dental", "Dental"),
      cat("eye_doctor", "Eye Care"),
      cat("pharmacy", "Pharmacy"),
      cat("nursing", "Nursing"),
      cat("vet", "Veterinary"),
      cat("other_medical", "Other Medical"),
    ],
    name: "Medical",
    order: 60,
    systemKey: "medical",
  },
  {
    categories: [
      cat("fitness", "Gym & Fitness"),
      cat("hair_beauty", "Hair & Beauty"),
      cat("laundry", "Laundry"),
      cat("vape", "Tobacco & Vape"),
      cat("other_personal_care", "Other Personal Care"),
    ],
    name: "Personal Care",
    order: 70,
    systemKey: "personal_care",
  },
  {
    categories: [
      cat("movies", "TV & Movies"),
      cat("streaming", "Streaming"),
      cat("music", "Music"),
      cat("video_games", "Video Games"),
      cat("event", "Events"),
      cat("sporting_goods", "Sporting Goods"),
      cat("books_media", "Books & Media"),
      cat("gambling", "Gambling"),
      cat("other_entertainment", "Other Entertainment"),
    ],
    name: "Entertainment",
    order: 80,
    systemKey: "entertainment",
  },
  {
    categories: [
      cat("flights", "Flights"),
      cat("hotels", "Hotels"),
      cat("rentals", "Rental Cars"),
      cat("other_travel", "Other Travel"),
    ],
    name: "Travel",
    order: 90,
    systemKey: "travel",
  },
  {
    categories: [
      cat("childcare", "Childcare"),
      cat("education", "Education"),
      cat("financial_service", "Financial Services"),
      cat("insurance", "Insurance"),
      cat("legal", "Legal & Consulting"),
      cat("office_supplies", "Office Supplies"),
      cat("pets", "Pets"),
      cat("shipping", "Shipping"),
      cat("storage", "Storage"),
      cat("other_services", "Other Services"),
    ],
    name: "Services",
    order: 100,
    systemKey: "general_services",
  },
  {
    categories: [
      cat("atm", "ATM Fee"),
      cat("foreign_transaction", "Foreign Transaction"),
      cat("insufficient", "Insufficient Funds"),
      cat("interest", "Interest Charge"),
      cat("overdraft", "Overdraft"),
      cat("other_bank_fees", "Other Bank Fees"),
    ],
    name: "Bank Fees",
    order: 110,
    systemKey: "bank_fees",
  },
  {
    categories: [
      cat("mortgage_payment", "Mortgage", false),
      cat("car_payment", "Car Payment", true),
      cat("credit_card_payment", "Credit Card Payment", true),
      cat("student_loan", "Student Loan", true),
      cat("other_loan", "Other Loan", true),
    ],
    name: "Loan Payments",
    order: 120,
    systemKey: "loan_payments",
  },
  {
    categories: [
      cat("taxes", "Taxes"),
      cat("donations", "Donations"),
      cat("government_fee", "Government Fee"),
      cat("other_government", "Other Government"),
    ],
    name: "Government & Non-Profit",
    order: 130,
    systemKey: "government_and_non_profit",
  },
  {
    categories: [
      cat("deposit", "Deposit", true),
      cat("withdrawal", "Withdrawal", true),
      cat("account_transfer", "Account Transfer", true),
      cat("savings_transfer", "Savings Transfer", true),
      cat("investment_transfer", "Investment Transfer", true),
      cat("cash_advance", "Cash Advance", true),
      cat("other_transfer", "Other Transfer", true),
    ],
    name: "Transfers",
    order: 140,
    systemKey: "transfers",
  },
  {
    categories: [
      cat("paycheck", "Paycheck"),
      cat("bonus", "Bonus"),
      cat("freelance", "Freelance"),
      cat("cashback", "Cashback"),
      cat("tax_returns", "Tax Refund"),
      cat("unemployment", "Unemployment"),
      cat("pension", "Pension"),
      cat("gift_received", "Gift Received"),
      cat("dividend", "Dividend", true),
      cat("interest_received", "Interest Received", true),
      cat("other_income", "Other Income"),
    ],
    name: "Income",
    order: 150,
    systemKey: "income",
  },
  {
    categories: [cat("uncategorized", "Uncategorized")],
    name: "Other",
    order: 160,
    systemKey: "other",
  },
];

/** Flat list — useful for backfill validation and unit tests. */
export const ALL_SYSTEM_KEYS: readonly CategorySystemKey[] = CATEGORY_GROUP_SEED.flatMap((g) =>
  g.categories.map((c) => c.systemKey),
);
