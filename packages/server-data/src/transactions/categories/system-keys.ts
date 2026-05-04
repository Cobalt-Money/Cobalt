/**
 * SRI-311: System category keys (88) + group keys (16).
 *
 * Mirrors the icon registry in `@cobalt-web/ui` (`category-system-icons.ts`).
 * Source of truth for backend (seed, PFC map, mutations); UI imports its own copy.
 * Drift is caught by the validation gate (count + key set must match registry).
 */

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

export type CategorySystemKey =
  // food_and_drink (6)
  | "alcohol_bars"
  | "coffee_shop"
  | "food_delivery"
  | "groceries"
  | "restaurants"
  | "snacks"
  // transportation (8)
  | "auto_maintenance"
  | "bike_scooter"
  | "gas_fuel"
  | "other_transportation"
  | "parking"
  | "public_transit"
  | "taxi"
  | "toll"
  // rent_and_utilities (7)
  | "energy"
  | "internet"
  | "other_utilities"
  | "phone"
  | "rent_mortgage"
  | "waste"
  | "water"
  // home_improvement (5)
  | "furniture"
  | "hardware"
  | "home_maintenance"
  | "other_home"
  | "security"
  // general_merchandise (5)
  | "clothing"
  | "convenience_store"
  | "electronics"
  | "gift"
  | "shopping"
  // medical (7)
  | "dental"
  | "eye_doctor"
  | "nursing"
  | "other_medical"
  | "pharmacy"
  | "primary"
  | "vet"
  // personal_care (5)
  | "fitness"
  | "hair_beauty"
  | "laundry"
  | "other_personal_care"
  | "vape"
  // entertainment (9)
  | "books_media"
  | "event"
  | "gambling"
  | "movies"
  | "music"
  | "other_entertainment"
  | "sporting_goods"
  | "streaming"
  | "video_games"
  // travel (4)
  | "flights"
  | "hotels"
  | "other_travel"
  | "rentals"
  // general_services (10)
  | "childcare"
  | "education"
  | "financial_service"
  | "insurance"
  | "legal"
  | "office_supplies"
  | "other_services"
  | "pets"
  | "shipping"
  | "storage"
  // bank_fees (6)
  | "atm"
  | "foreign_transaction"
  | "insufficient"
  | "interest"
  | "other_bank_fees"
  | "overdraft"
  // loan_payments (5)
  | "car_payment"
  | "credit_card_payment"
  | "mortgage_payment"
  | "other_loan"
  | "student_loan"
  // government_and_non_profit (4)
  | "donations"
  | "government_fee"
  | "other_government"
  | "taxes"
  // transfers (7)
  | "account_transfer"
  | "cash_advance"
  | "deposit"
  | "investment_transfer"
  | "other_transfer"
  | "savings_transfer"
  | "withdrawal"
  // income (11)
  | "bonus"
  | "cashback"
  | "dividend"
  | "freelance"
  | "gift_received"
  | "interest_received"
  | "other_income"
  | "paycheck"
  | "pension"
  | "tax_returns"
  | "unemployment"
  // other (1)
  | "uncategorized";
