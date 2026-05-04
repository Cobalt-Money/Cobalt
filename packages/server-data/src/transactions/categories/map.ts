/**
 * SRI-311: Plaid PFC detailed key → Cobalt `category.systemKey`.
 *
 * Locked rules from ticket:
 * - FOOD_AND_DRINK_RESTAURANT + _FAST_FOOD → restaurants
 * - FOOD_AND_DRINK_VENDING_MACHINES + _OTHER_FOOD_AND_DRINK → snacks
 * - LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT + _OTHER_PAYMENT → other_loan
 * - LOAN_PAYMENTS_MORTGAGE_PAYMENT → mortgage_payment (icon reuses rent_mortgage.svg)
 * - All TRANSFER_IN/OUT_* → corresponding transfers/* cat (merged across direction)
 * - GENERAL_MERCHANDISE redistributed:
 *   _BOOKSTORES_AND_NEWSSTANDS → entertainment.books_media
 *   _OFFICE_SUPPLIES → general_services.office_supplies
 *   _PET_SUPPLIES → general_services.pets
 *   _SPORTING_GOODS → entertainment.sporting_goods
 *   _TOBACCO_AND_VAPE → personal_care.vape
 * - INCOME_PAYROLL + _WAGES → paycheck
 * - All `_OTHER_*` PFC keys with no specific cat → uncategorized
 *
 * Unmapped PFC → `uncategorized` via `pfcDetailedToSystemKey` fallback.
 */

import type { CategorySystemKey } from "../categories/system-keys";

export const PFC_TO_SYSTEM_KEY: Record<string, CategorySystemKey> = {
  // BANK_FEES (6)
  BANK_FEES_ATM_FEES: "atm",
  BANK_FEES_FOREIGN_TRANSACTION_FEES: "foreign_transaction",
  BANK_FEES_INSUFFICIENT_FUNDS: "insufficient",
  BANK_FEES_INTEREST_CHARGE: "interest",
  BANK_FEES_OTHER_BANK_FEES: "other_bank_fees",
  BANK_FEES_OVERDRAFT_FEES: "overdraft",

  // ENTERTAINMENT (7)
  ENTERTAINMENT_CASINOS_AND_GAMBLING: "gambling",
  ENTERTAINMENT_MUSIC_AND_AUDIO: "music",
  ENTERTAINMENT_MUSIC_AND_VIDEO_STREAMING: "streaming",
  ENTERTAINMENT_OTHER_ENTERTAINMENT: "other_entertainment",
  ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS: "event",
  ENTERTAINMENT_TV_AND_MOVIES: "movies",
  ENTERTAINMENT_VIDEO_GAMES: "video_games",

  // FOOD_AND_DRINK (7)
  FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR: "alcohol_bars",
  FOOD_AND_DRINK_COFFEE: "coffee_shop",
  FOOD_AND_DRINK_FAST_FOOD: "restaurants",
  FOOD_AND_DRINK_GROCERIES: "groceries",
  FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK: "snacks",
  FOOD_AND_DRINK_RESTAURANT: "restaurants",
  FOOD_AND_DRINK_VENDING_MACHINES: "snacks",

  // GENERAL_MERCHANDISE (14) — many redistributed
  GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS: "books_media",
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES: "clothing",
  GENERAL_MERCHANDISE_CONVENIENCE_STORES: "convenience_store",
  GENERAL_MERCHANDISE_DEPARTMENT_STORES: "shopping",
  GENERAL_MERCHANDISE_DISCOUNT_STORES: "shopping",
  GENERAL_MERCHANDISE_ELECTRONICS: "electronics",
  GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES: "gift",
  GENERAL_MERCHANDISE_OFFICE_SUPPLIES: "office_supplies",
  GENERAL_MERCHANDISE_ONLINE_MARKETPLACES: "shopping",
  GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE: "shopping",
  GENERAL_MERCHANDISE_PET_SUPPLIES: "pets",
  GENERAL_MERCHANDISE_SPORTING_GOODS: "sporting_goods",
  GENERAL_MERCHANDISE_SUPERSTORES: "shopping",
  GENERAL_MERCHANDISE_TOBACCO_AND_VAPE: "vape",

  // GENERAL_SERVICES (9)
  GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING: "financial_service",
  GENERAL_SERVICES_AUTOMOTIVE: "auto_maintenance",
  GENERAL_SERVICES_CHILDCARE: "childcare",
  GENERAL_SERVICES_CONSULTING_AND_LEGAL: "legal",
  GENERAL_SERVICES_EDUCATION: "education",
  GENERAL_SERVICES_INSURANCE: "insurance",
  GENERAL_SERVICES_OTHER_GENERAL_SERVICES: "other_services",
  GENERAL_SERVICES_POSTAGE_AND_SHIPPING: "shipping",
  GENERAL_SERVICES_STORAGE: "storage",

  // GOVERNMENT_AND_NON_PROFIT (4)
  GOVERNMENT_AND_NON_PROFIT_DONATIONS: "donations",
  GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES: "government_fee",
  GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT: "other_government",
  GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT: "taxes",

  // HOME_IMPROVEMENT (5)
  HOME_IMPROVEMENT_FURNITURE: "furniture",
  HOME_IMPROVEMENT_HARDWARE: "hardware",
  HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT: "other_home",
  HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE: "home_maintenance",
  HOME_IMPROVEMENT_SECURITY: "security",

  // INCOME (8)
  INCOME_DIVIDENDS: "dividend",
  INCOME_INTEREST_EARNED: "interest_received",
  INCOME_OTHER_INCOME: "other_income",
  INCOME_PAYROLL: "paycheck",
  INCOME_RETIREMENT_PENSION: "pension",
  INCOME_TAX_REFUND: "tax_returns",
  INCOME_UNEMPLOYMENT: "unemployment",
  INCOME_WAGES: "paycheck",

  // LOAN_PAYMENTS (6)
  LOAN_PAYMENTS_CAR_PAYMENT: "car_payment",
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: "credit_card_payment",
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: "mortgage_payment",
  LOAN_PAYMENTS_OTHER_PAYMENT: "other_loan",
  LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT: "other_loan",
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: "student_loan",

  // MEDICAL (7)
  MEDICAL_DENTAL_CARE: "dental",
  MEDICAL_EYE_CARE: "eye_doctor",
  MEDICAL_NURSING_CARE: "nursing",
  MEDICAL_OTHER_MEDICAL: "other_medical",
  MEDICAL_PHARMACIES_AND_SUPPLEMENTS: "pharmacy",
  MEDICAL_PRIMARY_CARE: "primary",
  MEDICAL_VETERINARY_SERVICES: "vet",

  // PERSONAL_CARE (4)
  PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS: "fitness",
  PERSONAL_CARE_HAIR_AND_BEAUTY: "hair_beauty",
  PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING: "laundry",
  PERSONAL_CARE_OTHER_PERSONAL_CARE: "other_personal_care",

  // RENT_AND_UTILITIES (7)
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: "energy",
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: "internet",
  RENT_AND_UTILITIES_OTHER_UTILITIES: "other_utilities",
  RENT_AND_UTILITIES_RENT: "rent_mortgage",
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT: "waste",
  RENT_AND_UTILITIES_TELEPHONE: "phone",
  RENT_AND_UTILITIES_WATER: "water",

  // TRANSFER_IN (6)
  TRANSFER_IN_ACCOUNT_TRANSFER: "account_transfer",
  TRANSFER_IN_CASH_ADVANCES_AND_LOANS: "cash_advance",
  TRANSFER_IN_DEPOSIT: "deposit",
  TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS: "investment_transfer",
  TRANSFER_IN_OTHER_TRANSFER_IN: "other_transfer",
  TRANSFER_IN_SAVINGS: "savings_transfer",

  // TRANSFER_OUT (5)
  TRANSFER_OUT_ACCOUNT_TRANSFER: "account_transfer",
  TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS: "investment_transfer",
  TRANSFER_OUT_OTHER_TRANSFER_OUT: "other_transfer",
  TRANSFER_OUT_SAVINGS: "savings_transfer",
  TRANSFER_OUT_WITHDRAWAL: "withdrawal",

  // TRANSPORTATION (7)
  TRANSPORTATION_BIKES_AND_SCOOTERS: "bike_scooter",
  TRANSPORTATION_GAS: "gas_fuel",
  TRANSPORTATION_OTHER_TRANSPORTATION: "other_transportation",
  TRANSPORTATION_PARKING: "parking",
  TRANSPORTATION_PUBLIC_TRANSIT: "public_transit",
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: "taxi",
  TRANSPORTATION_TOLLS: "toll",

  // TRAVEL (4)
  TRAVEL_FLIGHTS: "flights",
  TRAVEL_LODGING: "hotels",
  TRAVEL_OTHER_TRAVEL: "other_travel",
  TRAVEL_RENTAL_CARS: "rentals",
};

/** Resolve Plaid PFC detailed key → systemKey. Unmapped/null → `uncategorized`. */
export function pfcDetailedToSystemKey(detail: string | null | undefined): CategorySystemKey {
  if (!detail) {
    return "uncategorized";
  }
  return PFC_TO_SYSTEM_KEY[detail] ?? "uncategorized";
}
