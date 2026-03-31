/**
 * Plaid personal finance primary / detailed category → display labels.
 * (Icons live in the web app — `@hugeicons` / `public/assets/vectors`.)
 */

export interface CategoryData {
  primary: string;
  detailed: string;
  confidence_level?: string;
  version?: string;
}

export const formatCategoryName = (categoryName: string): string =>
  categoryName.replaceAll("_", " ");

export const CATEGORY_MAPPING = {
  BANK_FEES: { label: "Bank Fees" },
  ENTERTAINMENT: { label: "Entertainment" },
  FOOD_AND_DRINK: { label: "Food & Drink" },
  GENERAL_MERCHANDISE: { label: "Shopping" },
  GENERAL_SERVICES: { label: "Services" },
  GOVERNMENT_AND_NON_PROFIT: { label: "Government" },
  HOME_IMPROVEMENT: { label: "Home & Garden" },
  INCOME: { label: "Income" },
  LOAN_PAYMENTS: { label: "Loan Payments" },
  MEDICAL: { label: "Medical" },
  PERSONAL_CARE: { label: "Personal Care" },
  RENT_AND_UTILITIES: { label: "Rent & Utilities" },
  TRANSFER_IN: { label: "Transfer In" },
  TRANSFER_OUT: { label: "Transfer Out" },
  TRANSPORTATION: { label: "Transportation" },
  TRAVEL: { label: "Travel" },
} as const;

export const DETAILED_CATEGORY_MAPPING = {
  BANK_FEES_ATM_FEES: "ATM Fee",
  BANK_FEES_FOREIGN_TRANSACTION_FEES: "Foreign Transaction",
  BANK_FEES_INSUFFICIENT_FUNDS: "Insufficient Funds",
  BANK_FEES_INTEREST_CHARGE: "Interest Charge",
  BANK_FEES_OTHER_BANK_FEES: "Other Bank Fee",
  BANK_FEES_OVERDRAFT_FEES: "Overdraft Fee",
  ENTERTAINMENT_CASINOS_AND_GAMBLING: "Gambling",
  ENTERTAINMENT_MUSIC_AND_AUDIO: "Music & Audio",
  ENTERTAINMENT_MUSIC_AND_VIDEO_STREAMING: "Music & Video Streaming",
  ENTERTAINMENT_OTHER_ENTERTAINMENT: "Other Entertainment",
  ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS: "Events & Museums",
  ENTERTAINMENT_TV_AND_MOVIES: "TV & Movies",
  ENTERTAINMENT_VIDEO_GAMES: "Video Games",
  FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR: "Alcohol",
  FOOD_AND_DRINK_COFFEE: "Coffee",
  FOOD_AND_DRINK_FAST_FOOD: "Fast Food",
  FOOD_AND_DRINK_GROCERIES: "Groceries",
  FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK: "Other Food",
  FOOD_AND_DRINK_RESTAURANT: "Restaurants",
  FOOD_AND_DRINK_RESTAURANTS: "Restaurants",
  FOOD_AND_DRINK_VENDING_MACHINES: "Vending Machine",
  GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS: "Books & News",
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES: "Clothing",
  GENERAL_MERCHANDISE_CONVENIENCE_STORES: "Convenience Store",
  GENERAL_MERCHANDISE_DEPARTMENT_STORES: "Department Store",
  GENERAL_MERCHANDISE_DISCOUNT_STORES: "Discount Store",
  GENERAL_MERCHANDISE_ELECTRONICS: "Electronics",
  GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES: "Gifts",
  GENERAL_MERCHANDISE_OFFICE_SUPPLIES: "Office Supplies",
  GENERAL_MERCHANDISE_ONLINE_MARKETPLACES: "Online Shopping",
  GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE: "Other Shopping",
  GENERAL_MERCHANDISE_PET_SUPPLIES: "Pet Supplies",
  GENERAL_MERCHANDISE_SPORTING_GOODS: "Sports & Outdoors",
  GENERAL_MERCHANDISE_SUPERSTORES: "Superstore",
  GENERAL_MERCHANDISE_TOBACCO_AND_VAPE: "Tobacco & Vape",
  GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING: "Financial Services",
  GENERAL_SERVICES_AUTOMOTIVE: "Auto Services",
  GENERAL_SERVICES_CHILDCARE: "Childcare",
  GENERAL_SERVICES_CONSULTING_AND_LEGAL: "Consulting & Legal",
  GENERAL_SERVICES_EDUCATION: "Education",
  GENERAL_SERVICES_INSURANCE: "Insurance",
  GENERAL_SERVICES_OTHER_GENERAL_SERVICES: "Other Services",
  GENERAL_SERVICES_POSTAGE_AND_SHIPPING: "Shipping",
  GENERAL_SERVICES_STORAGE: "Storage",
  GOVERNMENT_AND_NON_PROFIT_DONATIONS: "Donations",
  GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES: "Government",
  GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT: "Other Government",
  GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT: "Tax Payment",
  HOME_IMPROVEMENT_FURNITURE: "Furniture",
  HOME_IMPROVEMENT_HARDWARE: "Hardware",
  HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT: "Other Home",
  HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE: "Repairs",
  HOME_IMPROVEMENT_SECURITY: "Security",
  INCOME_DIVIDENDS: "Dividends",
  INCOME_INTEREST_EARNED: "Interest",
  INCOME_OTHER_INCOME: "Other Income",
  INCOME_PAYROLL: "Payroll",
  INCOME_RETIREMENT_PENSION: "Pension",
  INCOME_TAX_REFUND: "Tax Refund",
  INCOME_UNEMPLOYMENT: "Unemployment",
  INCOME_WAGES: "Salary",
  LOAN_PAYMENTS_CAR_PAYMENT: "Car Payment",
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT: "Credit Card Payment",
  LOAN_PAYMENTS_MORTGAGE_PAYMENT: "Mortgage",
  LOAN_PAYMENTS_OTHER_PAYMENT: "Other Loan",
  LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT: "Personal Loan",
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT: "Student Loan",
  MEDICAL_DENTAL_CARE: "Dental",
  MEDICAL_EYE_CARE: "Eye Care",
  MEDICAL_NURSING_CARE: "Nursing Care",
  MEDICAL_OTHER_MEDICAL: "Other Medical",
  MEDICAL_PHARMACIES_AND_SUPPLEMENTS: "Pharmacy",
  MEDICAL_PRIMARY_CARE: "Doctor",
  MEDICAL_VETERINARY_SERVICES: "Veterinary",
  PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS: "Gym & Fitness",
  PERSONAL_CARE_HAIR_AND_BEAUTY: "Hair & Beauty",
  PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING: "Laundry",
  PERSONAL_CARE_OTHER_PERSONAL_CARE: "Other Personal Care",
  RENT_AND_UTILITIES_GAS_AND_ELECTRICITY: "Gas & Electric",
  RENT_AND_UTILITIES_INTERNET_AND_CABLE: "Internet & Cable",
  RENT_AND_UTILITIES_OTHER_UTILITIES: "Other Utilities",
  RENT_AND_UTILITIES_RENT: "Rent",
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT: "Waste Management",
  RENT_AND_UTILITIES_TELEPHONE: "Phone",
  RENT_AND_UTILITIES_WATER: "Water",
  TRANSFER_IN_ACCOUNT_TRANSFER: "Account Transfer",
  TRANSFER_IN_CASH_ADVANCES_AND_LOANS: "Loans & Advances",
  TRANSFER_IN_DEPOSIT: "Deposits",
  TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS: "Investment Transfer",
  TRANSFER_IN_OTHER_TRANSFER_IN: "Other Transfer In",
  TRANSFER_IN_SAVINGS: "Savings Transfer",
  TRANSFER_OUT_ACCOUNT_TRANSFER: "Account Transfer",
  TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS: "Investment Transfer",
  TRANSFER_OUT_OTHER_TRANSFER_OUT: "Other Transfer Out",
  TRANSFER_OUT_SAVINGS: "Savings Transfer",
  TRANSFER_OUT_WITHDRAWAL: "Withdrawal",
  TRANSPORTATION_BIKES_AND_SCOOTERS: "Bikes & Scooters",
  TRANSPORTATION_GAS: "Gas",
  TRANSPORTATION_OTHER_TRANSPORTATION: "Other Transport",
  TRANSPORTATION_PARKING: "Parking",
  TRANSPORTATION_PUBLIC_TRANSIT: "Public Transit",
  TRANSPORTATION_TAXIS: "Taxis",
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES: "Rideshare & Taxi",
  TRANSPORTATION_TOLLS: "Tolls",
  TRAVEL_FLIGHTS: "Flights",
  TRAVEL_LODGING: "Hotels",
  TRAVEL_OTHER_TRAVEL: "Other Travel",
  TRAVEL_RENTAL_CARS: "Car Rental",
} as const;

export const getDetailedCategoryDisplayName = (
  detailedCategory: string | null
): string => {
  if (!detailedCategory) {
    return "—";
  }

  const customLabel =
    DETAILED_CATEGORY_MAPPING[
      detailedCategory as keyof typeof DETAILED_CATEGORY_MAPPING
    ];
  return customLabel || detailedCategory.replaceAll("_", " ");
};

export const getPrimaryCategoryLabel = (
  category: CategoryData | null
): string => {
  if (!category?.primary) {
    return "Unknown";
  }

  const key = category.primary as keyof typeof CATEGORY_MAPPING;
  const mapped = CATEGORY_MAPPING[key];
  if (mapped) {
    return mapped.label;
  }

  return formatCategoryName(category.primary);
};
