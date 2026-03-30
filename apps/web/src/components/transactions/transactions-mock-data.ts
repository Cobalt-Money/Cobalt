import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";

import type { PrimaryCategoryKey } from "./category-primary-icons";

/** One row per Plaid primary (+ unknown) — all dated in January 2026 so they land in the first month strip. */
const SHOWCASE_PRIMARY_ORDER: PrimaryCategoryKey[] = [
  "BANK_FEES",
  "ENTERTAINMENT",
  "FOOD_AND_DRINK",
  "GENERAL_MERCHANDISE",
  "GENERAL_SERVICES",
  "GOVERNMENT_AND_NON_PROFIT",
  "HOME_IMPROVEMENT",
  "INCOME",
  "LOAN_PAYMENTS",
  "MEDICAL",
  "PERSONAL_CARE",
  "RENT_AND_UTILITIES",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "TRANSPORTATION",
  "TRAVEL",
];

const SHOWCASE_DETAILED: Record<PrimaryCategoryKey, string> = {
  BANK_FEES: "BANK_FEES_ATM_FEES",
  ENTERTAINMENT: "ENTERTAINMENT_TV_AND_MOVIES",
  FOOD_AND_DRINK: "FOOD_AND_DRINK_GROCERIES",
  GENERAL_MERCHANDISE: "GENERAL_MERCHANDISE_DEPARTMENT_STORES",
  GENERAL_SERVICES: "GENERAL_SERVICES_INSURANCE",
  GOVERNMENT_AND_NON_PROFIT: "GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT",
  HOME_IMPROVEMENT: "HOME_IMPROVEMENT_HARDWARE",
  INCOME: "INCOME_PAYROLL",
  LOAN_PAYMENTS: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT",
  MEDICAL: "MEDICAL_PHARMACIES_AND_SUPPLEMENTS",
  PERSONAL_CARE: "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS",
  RENT_AND_UTILITIES: "RENT_AND_UTILITIES_RENT",
  TRANSFER_IN: "TRANSFER_IN_DEPOSIT",
  TRANSFER_OUT: "TRANSFER_OUT_SAVINGS",
  TRANSPORTATION: "TRANSPORTATION_GAS",
  TRAVEL: "TRAVEL_FLIGHTS",
};

/** Real HTTPS origins so merchant / institution logo fallbacks resolve in dev. */
const SHOWCASE_MERCHANT: Record<
  PrimaryCategoryKey,
  { merchantName: string; website: string | null }
> = {
  BANK_FEES: {
    merchantName: "Chase ATM",
    website: "https://www.chase.com",
  },
  ENTERTAINMENT: {
    merchantName: "Netflix",
    website: "https://www.netflix.com",
  },
  FOOD_AND_DRINK: {
    merchantName: "Whole Foods Market",
    website: "https://www.wholefoodsmarket.com",
  },
  GENERAL_MERCHANDISE: {
    merchantName: "Target",
    website: "https://www.target.com",
  },
  GENERAL_SERVICES: {
    merchantName: "State Farm",
    website: "https://www.statefarm.com",
  },
  GOVERNMENT_AND_NON_PROFIT: {
    merchantName: "IRS",
    website: "https://www.irs.gov",
  },
  HOME_IMPROVEMENT: {
    merchantName: "The Home Depot",
    website: "https://www.homedepot.com",
  },
  INCOME: {
    merchantName: "ADP Payroll",
    website: "https://www.adp.com",
  },
  LOAN_PAYMENTS: {
    merchantName: "Chase Card Services",
    website: "https://www.chase.com",
  },
  MEDICAL: {
    merchantName: "CVS Pharmacy",
    website: "https://www.cvs.com",
  },
  PERSONAL_CARE: {
    merchantName: "Equinox",
    website: "https://www.equinox.com",
  },
  RENT_AND_UTILITIES: {
    merchantName: "PG&E",
    website: "https://www.pge.com",
  },
  TRANSFER_IN: {
    merchantName: "Mobile Deposit",
    website: "https://www.chase.com",
  },
  TRANSFER_OUT: {
    merchantName: "Ally Savings",
    website: "https://www.ally.com",
  },
  TRANSPORTATION: {
    merchantName: "Shell",
    website: "https://www.shell.com",
  },
  TRAVEL: {
    merchantName: "Delta Air Lines",
    website: "https://www.delta.com",
  },
};

function showcaseAmount(primary: PrimaryCategoryKey): number {
  if (primary === "INCOME" || primary === "TRANSFER_IN") {
    return 100;
  }
  return -10;
}

function buildFirstMonthShowcase(): TransactionListItem[] {
  const base: TransactionListItem = {
    accountName: "Checking ···4821",
    accountType: "depository",
    amount: -1,
    authorizedDate: null,
    counterparties: null,
    date: "2026-01-31",
    id: "f0000000-0000-4000-8000-00000000ba5e",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: null,
    name: "",
    pending: false,
    personalFinanceCategory: null,
    plaidAccountId: "plaid-acc-checking-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: null,
  };

  const primaries = SHOWCASE_PRIMARY_ORDER.map((primary, index) => {
    const day = 31 - index;
    const { merchantName, website } = SHOWCASE_MERCHANT[primary];
    return {
      ...base,
      amount: showcaseAmount(primary),
      date: `2026-01-${String(day).padStart(2, "0")}`,
      id: `f0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      merchantName,
      name: `MOCK · ${primary}`,
      personalFinanceCategory: {
        detailed: SHOWCASE_DETAILED[primary],
        primary,
      },
      website,
    } satisfies TransactionListItem;
  });

  const unknown: TransactionListItem = {
    ...base,
    amount: -1,
    date: "2026-01-15",
    id: "f0000000-0000-4000-8000-000000000099",
    name: "MOCK · UNKNOWN CATEGORY",
    personalFinanceCategory: null,
  };

  return [...primaries, unknown];
}

/** Seed rows — expanded below to fill the page for layout work. */
const MOCK_TRANSACTION_SEED: TransactionListItem[] = [
  {
    accountName: "Checking ···4821",
    accountType: "depository",
    amount: -84.25,
    authorizedDate: "2025-03-23",
    counterparties: null,
    date: "2025-03-24",
    id: "a0000001-0000-4000-8000-000000000001",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Whole Foods Market",
    name: "WHOLE FOODS MKT #12345",
    pending: false,
    personalFinanceCategory: {
      detailed: "FOOD_AND_DRINK_GROCERIES",
      primary: "FOOD_AND_DRINK",
    },
    plaidAccountId: "plaid-acc-checking-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.wholefoodsmarket.com",
  },
  {
    accountName: "Checking ···4821",
    accountType: "depository",
    amount: 3250,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-23",
    id: "a0000001-0000-4000-8000-000000000002",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Employer Payroll",
    name: "DIRECT DEP EMPLOYER PAYROLL",
    pending: false,
    personalFinanceCategory: {
      detailed: "INCOME_PAYROLL",
      primary: "INCOME",
    },
    plaidAccountId: "plaid-acc-checking-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: null,
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -48,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-23",
    id: "a0000001-0000-4000-8000-000000000003",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Shell",
    name: "SHELL OIL 12345",
    pending: false,
    personalFinanceCategory: {
      detailed: "TRANSPORTATION_GAS",
      primary: "TRANSPORTATION",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.shell.com",
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -15.99,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-22",
    id: "a0000001-0000-4000-8000-000000000004",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Netflix",
    name: "NETFLIX.COM",
    pending: false,
    personalFinanceCategory: {
      detailed: "ENTERTAINMENT_MUSIC_AND_VIDEO_STREAMING",
      primary: "ENTERTAINMENT",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.netflix.com",
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -67.33,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-22",
    id: "a0000001-0000-4000-8000-000000000005",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Amazon",
    name: "AMZN Mktp US",
    pending: true,
    personalFinanceCategory: {
      detailed: "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES",
      primary: "GENERAL_MERCHANDISE",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.amazon.com",
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -6.25,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-21",
    id: "a0000001-0000-4000-8000-000000000006",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Blue Bottle Coffee",
    name: "BLUE BOTTLE COFFEE",
    pending: false,
    personalFinanceCategory: {
      detailed: "FOOD_AND_DRINK_COFFEE",
      primary: "FOOD_AND_DRINK",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.bluebottlecoffee.com",
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -28.4,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-20",
    id: "a0000001-0000-4000-8000-000000000007",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Uber",
    name: "UBER TRIP",
    pending: false,
    personalFinanceCategory: {
      detailed: "TRANSPORTATION_TAXIS_AND_RIDE_SHARES",
      primary: "TRANSPORTATION",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.uber.com",
  },
  {
    accountName: "Checking ···4821",
    accountType: "depository",
    amount: -500,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-20",
    id: "a0000001-0000-4000-8000-000000000008",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: null,
    name: "TRANSFER TO SAVINGS XXXXX",
    pending: false,
    personalFinanceCategory: {
      detailed: "TRANSFER_OUT_SAVINGS",
      primary: "TRANSFER_OUT",
    },
    plaidAccountId: "plaid-acc-checking-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: null,
  },
  {
    accountName: "Checking ···4821",
    accountType: "depository",
    amount: -124.5,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-19",
    id: "a0000001-0000-4000-8000-000000000009",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "PG&E",
    name: "PG&E BILL PAY",
    pending: false,
    personalFinanceCategory: {
      detailed: "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY",
      primary: "RENT_AND_UTILITIES",
    },
    plaidAccountId: "plaid-acc-checking-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.pge.com",
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -112.08,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-18",
    id: "a0000001-0000-4000-8000-000000000010",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Target",
    name: "TARGET T-1234",
    pending: false,
    personalFinanceCategory: {
      detailed: "GENERAL_MERCHANDISE_DEPARTMENT_STORES",
      primary: "GENERAL_MERCHANDISE",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.target.com",
  },
  {
    accountName: "Savings ···7730",
    accountType: "depository",
    amount: 4.12,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-17",
    id: "a0000001-0000-4000-8000-000000000011",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: null,
    name: "INTEREST PAYMENT",
    pending: false,
    personalFinanceCategory: {
      detailed: "INCOME_INTEREST_EARNED",
      primary: "INCOME",
    },
    plaidAccountId: "plaid-acc-savings-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: null,
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -10.99,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-16",
    id: "a0000001-0000-4000-8000-000000000012",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Spotify",
    name: "SPOTIFY USA",
    pending: false,
    personalFinanceCategory: {
      detailed: "ENTERTAINMENT_MUSIC_AND_AUDIO",
      primary: "ENTERTAINMENT",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.spotify.com",
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -56.12,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-15",
    id: "a0000001-0000-4000-8000-000000000013",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Trader Joe's",
    name: "TRADER JOES #999",
    pending: false,
    personalFinanceCategory: {
      detailed: "FOOD_AND_DRINK_GROCERIES",
      primary: "FOOD_AND_DRINK",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.traderjoes.com",
  },
  {
    accountName: "Checking ···4821",
    accountType: "depository",
    amount: -200,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-14",
    id: "a0000001-0000-4000-8000-000000000014",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: null,
    name: "ATM WITHDRAWAL",
    pending: false,
    personalFinanceCategory: {
      detailed: "BANK_FEES_ATM_FEES",
      primary: "BANK_FEES",
    },
    plaidAccountId: "plaid-acc-checking-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: null,
  },
  {
    accountName: "Credit ···9012",
    accountType: "credit",
    amount: -428.9,
    authorizedDate: null,
    counterparties: null,
    date: "2025-03-13",
    id: "a0000001-0000-4000-8000-000000000015",
    institutionLogo: null,
    institutionName: "Chase",
    institutionUrl: "https://www.chase.com",
    location: null,
    logoUrl: null,
    merchantName: "Delta Air Lines",
    name: "DELTA AIR",
    pending: true,
    personalFinanceCategory: {
      detailed: "TRAVEL_FLIGHTS",
      primary: "TRAVEL",
    },
    plaidAccountId: "plaid-acc-credit-1",
    userOverrideCategory: null,
    userOverrideDate: null,
    userOverrideName: null,
    website: "https://www.delta.com",
  },
];

function shiftIsoDate(iso: string, daysBack: number): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

/** Repeated seed (15 templates × 5 cycles) + January 2026 rows with every category for the top month strip. */
export const MOCK_TRANSACTIONS: TransactionListItem[] = (() => {
  const cycles = 5;
  const out: TransactionListItem[] = [];
  for (let c = 0; c < cycles; c += 1) {
    for (let i = 0; i < MOCK_TRANSACTION_SEED.length; i += 1) {
      const row = MOCK_TRANSACTION_SEED[i];
      const dayOffset = c * 20 + i;
      const dateStr = shiftIsoDate(row.date, dayOffset);
      const authorizedDateStr = row.authorizedDate
        ? shiftIsoDate(row.authorizedDate, dayOffset)
        : null;
      const idSuffix = (c * 100 + i).toString(16).padStart(12, "0");
      out.push({
        ...row,
        amount:
          Math.round(row.amount * (1 + c * 0.012 + i * 0.001) * 100) / 100,
        authorizedDate: authorizedDateStr,
        date: dateStr,
        id: `00000000-0000-4000-8000-${idSuffix}`,
        pending: c === 0 ? row.pending : false,
      });
    }
  }
  out.push(...buildFirstMonthShowcase());
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
})();
