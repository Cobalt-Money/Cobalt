/**
 * Demo fixture template. Cloned per ephemeral demo user.
 * Dates shifted relative to `now()` at seed time so "this month" always works.
 *
 * Source of truth: edit here, the seed function clones rows with fresh UUIDs
 * + the demo user's id. No FKs hardcoded — accounts get random ids at seed,
 * txns reference them by index into the accounts array.
 */

export interface DemoAccountSeed {
  /** Stable key used by transaction rows to reference this account. */
  key: string;
  name: string;
  /** Maps to financial_account.type. */
  type: "depository" | "credit" | "investment" | "loan";
  /** Granular bucket (checking, savings, credit card, brokerage, roth ira, 401k, student). */
  subtype: string;
  mask: string;
  /** Current balance. Depository/investment = positive (held). Credit/loan = positive (owed). */
  balance: string;
  /** Credit cards only. */
  creditLimit?: string;
  institutionName: string;
  logoDomain?: string;
  /**
   * Provider attribution. Defaults to "manual" but investment accounts must be
   * "snaptrade" (or "plaid" if type === "investment") for the brokerage UI to
   * show them — see brokerage queries' source filter in packages/zero/src/brokerage/queries.ts.
   */
  source?: "manual" | "plaid" | "snaptrade";
}

/**
 * Merchant → public web domain. Used by the seed function to populate
 * `transaction.website`, which the UI feeds into Brandfetch to render a
 * proper merchant logo (`packages/ui/src/cobalt/logos/merchant-logo.tsx`).
 * Lowercased keys; lookup is case-insensitive.
 */
export const DEMO_MERCHANT_WEBSITES: Record<string, string> = {
  "acme corp": "acme.com",
  airbnb: "airbnb.com",
  "ally bank": "ally.com",
  amazon: "amazon.com",
  "american express": "americanexpress.com",
  "anchor oyster bar": "anchoroysterbar.com",
  apple: "apple.com",
  "blue bottle": "bluebottlecoffee.com",
  "bookshop.org": "bookshop.org",
  "burma superstar": "burmasuperstar.com",
  caviar: "trycaviar.com",
  chase: "chase.com",
  chevron: "chevron.com",
  comcast: "xfinity.com",
  "disney+": "disneyplus.com",
  "doctors without borders": "doctorswithoutborders.org",
  doordash: "doordash.com",
  equinox: "equinox.com",
  everlane: "everlane.com",
  fastrak: "bayareafastrak.org",
  "foreign cinema": "foreigncinema.com",
  "goorin bros": "goorin.com",
  "lazy bear": "lazybearsf.com",
  linear: "linear.app",
  lyft: "lyft.com",
  "mission chinese": "missionchinese.com",
  "moody's": "moodysbistro.com",
  netflix: "netflix.com",
  nopa: "nopasf.com",
  "one medical": "onemedical.com",
  openai: "openai.com",
  "palisades tahoe": "palisadestahoe.com",
  "peoples barber": "peoplesbarbershop.com",
  "pg&e": "pge.com",
  ritual: "ritualcoffee.com",
  "ritual coffee": "ritualcoffee.com",
  safeway: "safeway.com",
  "sallie mae": "salliemae.com",
  sfpuc: "sfpuc.org",
  shell: "shell.com",
  sightglass: "sightglasscoffee.com",
  "sightglass coffee": "sightglasscoffee.com",
  souvla: "souvla.com",
  spotify: "spotify.com",
  starbucks: "starbucks.com",
  "state bird provisions": "statebirdsf.com",
  stripe: "stripe.com",
  "t-mobile": "t-mobile.com",
  tartine: "tartinebakery.com",
  "the new york times": "nytimes.com",
  "trader joe's": "traderjoes.com",
  uber: "uber.com",
  "uber eats": "ubereats.com",
  uniqlo: "uniqlo.com",
  vercel: "vercel.com",
  walgreens: "walgreens.com",
  "whole foods": "wholefoodsmarket.com",
  wikipedia: "wikipedia.org",
  "zuni cafe": "zunicafe.com",
};

export interface DemoTagSeed {
  /** Stable key for transaction rows to reference. */
  key: string;
  name: string;
  /** Member of TAG_COLORS palette (red, orange, amber, yellow, lime, green, teal, cyan, …). */
  color: string;
}

export interface DemoTxnSeed {
  /** Days ago (positive int). */
  daysAgo: number;
  /** References DemoAccountSeed.key. */
  accountKey: string;
  amount: string;
  name: string;
  merchantName?: string;
  /** category.system_key — resolved to user's category row at seed. */
  categoryKey: string;
  pending?: boolean;
  /** References DemoTagSeed.key. Inserted as transaction_tag rows. */
  tagKeys?: string[];
  /** Markdown user notes shown in transaction detail. */
  notes?: string;
  // ── Merchant location (optional) ──────────────────────────────
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  /** ISO-3166 alpha-2. */
  country?: string;
  lat?: number;
  lon?: number;
}

export interface DemoRecurringSeed {
  /** Match transactions by `merchantName` (case-insensitive) on this account. */
  accountKey: string;
  merchantName: string;
  /** Display description in the subscriptions list. */
  description: string;
  /** Plaid convention: WEEKLY, BIWEEKLY, MONTHLY, SEMI_MONTHLY, ANNUALLY, UNKNOWN. */
  frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "SEMI_MONTHLY" | "ANNUALLY" | "UNKNOWN";
  /** outflow = money out (subscription/bill), inflow = money in (paycheck). */
  streamType: "inflow" | "outflow";
  /** category.system_key. */
  categoryKey: string;
}

/**
 * Detected recurring streams. Seed function matches transactions by merchant
 * name and populates `transaction_ids` + `average_amount` + `last_amount` etc
 * from the matched set.
 */
export const DEMO_RECURRING: DemoRecurringSeed[] = [
  // Inflows
  {
    accountKey: "checking",
    categoryKey: "paycheck",
    description: "Acme Corp payroll",
    frequency: "BIWEEKLY",
    merchantName: "Acme Corp",
    streamType: "inflow",
  },
  {
    accountKey: "checking",
    categoryKey: "freelance",
    description: "Komali Design retainer",
    frequency: "UNKNOWN",
    merchantName: "Stripe",
    streamType: "inflow",
  },
  {
    accountKey: "savings",
    categoryKey: "interest_received",
    description: "Ally savings interest",
    frequency: "MONTHLY",
    merchantName: "Ally Bank",
    streamType: "inflow",
  },

  // Outflows — housing + utilities
  {
    accountKey: "checking",
    categoryKey: "rent_mortgage",
    description: "Bayview Apartments rent",
    frequency: "MONTHLY",
    merchantName: "Bayview Apartments",
    streamType: "outflow",
  },
  {
    accountKey: "checking",
    categoryKey: "energy",
    description: "PG&E electric",
    frequency: "MONTHLY",
    merchantName: "PG&E",
    streamType: "outflow",
  },
  {
    accountKey: "checking",
    categoryKey: "internet",
    description: "Comcast Xfinity",
    frequency: "MONTHLY",
    merchantName: "Comcast",
    streamType: "outflow",
  },
  {
    accountKey: "checking",
    categoryKey: "phone",
    description: "T-Mobile wireless",
    frequency: "MONTHLY",
    merchantName: "T-Mobile",
    streamType: "outflow",
  },
  {
    accountKey: "checking",
    categoryKey: "water",
    description: "SFPUC water",
    frequency: "MONTHLY",
    merchantName: "SFPUC",
    streamType: "outflow",
  },

  // Outflows — streaming + media
  {
    accountKey: "credit_sapphire",
    categoryKey: "streaming",
    description: "Netflix",
    frequency: "MONTHLY",
    merchantName: "Netflix",
    streamType: "outflow",
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "streaming",
    description: "Spotify",
    frequency: "MONTHLY",
    merchantName: "Spotify",
    streamType: "outflow",
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "streaming",
    description: "Disney+",
    frequency: "MONTHLY",
    merchantName: "Disney+",
    streamType: "outflow",
  },
  {
    accountKey: "credit_amex",
    categoryKey: "books_media",
    description: "The New York Times",
    frequency: "MONTHLY",
    merchantName: "The New York Times",
    streamType: "outflow",
  },

  // Outflows — fitness + saas
  {
    accountKey: "credit_sapphire",
    categoryKey: "fitness",
    description: "Equinox membership",
    frequency: "MONTHLY",
    merchantName: "Equinox",
    streamType: "outflow",
  },
  {
    accountKey: "credit_amex",
    categoryKey: "financial_service",
    description: "Vercel hobby plan",
    frequency: "MONTHLY",
    merchantName: "Vercel",
    streamType: "outflow",
  },
  {
    accountKey: "credit_amex",
    categoryKey: "financial_service",
    description: "Linear team plan",
    frequency: "MONTHLY",
    merchantName: "Linear",
    streamType: "outflow",
  },
  {
    accountKey: "credit_amex",
    categoryKey: "financial_service",
    description: "OpenAI",
    frequency: "MONTHLY",
    merchantName: "OpenAI",
    streamType: "outflow",
  },

  // Outflows — debt
  {
    accountKey: "checking",
    categoryKey: "student_loan",
    description: "Sallie Mae student loan",
    frequency: "MONTHLY",
    merchantName: "Sallie Mae",
    streamType: "outflow",
  },
];

export interface DemoSnapshotTrajectory {
  /** References DemoAccountSeed.key. */
  accountKey: string;
  /** Balance 180 days ago. End balance = the account's current `balance`. */
  startBalance: number;
  /** Wiggle amplitude as a fraction of the trajectory's span (0–1).
   * Higher = more volatile-looking chart. Volatile-asset accounts ~0.04;
   * cash/loans ~0.005. */
  volatility: number;
}

/**
 * Per-account 180-day trajectories. Drives weekly snapshot generation in the
 * seed function. End balance is taken from `DEMO_ACCOUNTS[i].balance` — we
 * only declare the starting point + how bumpy the line looks getting there.
 *
 * Story:
 *   • checking — modest drift up, payday sawtooth
 *   • savings — steady climb (transfers + interest)
 *   • credit_sapphire / credit_amex — oscillate (charged then paid)
 *   • brokerage — strong climb with market noise + lump bonus deposit
 *   • roth_ira / 401k — steady climb
 *   • student_loan — linear decline (~$435/mo paid down)
 */
export const DEMO_SNAPSHOT_TRAJECTORIES: DemoSnapshotTrajectory[] = [
  { accountKey: "checking", startBalance: 3200, volatility: 0.08 },
  { accountKey: "savings", startBalance: 9000, volatility: 0.005 },
  { accountKey: "credit_sapphire", startBalance: 410, volatility: 0.45 },
  { accountKey: "credit_amex", startBalance: 220, volatility: 0.35 },
  { accountKey: "brokerage", startBalance: 32_000, volatility: 0.04 },
  { accountKey: "roth_ira", startBalance: 17_500, volatility: 0.03 },
  { accountKey: "401k", startBalance: 44_000, volatility: 0.025 },
  { accountKey: "student_loan", startBalance: 30_920, volatility: 0.001 },
];

export interface DemoChatMessageSeed {
  role: "user" | "assistant";
  text: string;
  /** Minutes ago (positive int). Created in order. */
  minutesAgo: number;
}

export interface DemoChatSeed {
  title: string;
  /** Days ago for the chat row's createdAt. */
  daysAgo: number;
  messages: DemoChatMessageSeed[];
}

export interface DemoHoldingSeed {
  accountKey: string;
  ticker: string;
  name: string;
  quantity: string;
  price: string;
  costBasis: string;
}

/**
 * Late-20s saver persona. Mix designed to exercise every dashboard surface:
 * cash flow (checking + credit), savings goal (HYSA), investments
 * (taxable + Roth + 401k), liabilities (student loan). Net worth ~$118k after
 * student debt drag — positive trajectory, believable but not flashy.
 */
export const DEMO_ACCOUNTS: DemoAccountSeed[] = [
  // ── Depository ────────────────────────────────────────────────────
  {
    balance: "4823.41",
    institutionName: "Chase",
    key: "checking",
    logoDomain: "chase.com",
    mask: "4421",
    name: "Total Checking",
    subtype: "checking",
    type: "depository",
  },
  {
    balance: "18450.00",
    institutionName: "Ally Bank",
    key: "savings",
    logoDomain: "ally.com",
    mask: "7733",
    name: "Savings Account",
    subtype: "savings",
    type: "depository",
  },

  // ── Credit cards ──────────────────────────────────────────────────
  {
    balance: "1284.67",
    creditLimit: "15000.00",
    institutionName: "Chase",
    key: "credit_sapphire",
    logoDomain: "chase.com",
    mask: "9912",
    name: "Sapphire Reserve",
    subtype: "credit card",
    type: "credit",
  },
  {
    balance: "642.18",
    creditLimit: "10000.00",
    institutionName: "American Express",
    key: "credit_amex",
    logoDomain: "americanexpress.com",
    mask: "1004",
    name: "Gold Card",
    subtype: "credit card",
    type: "credit",
  },

  // ── Investments ───────────────────────────────────────────────────
  {
    balance: "42137.18",
    institutionName: "Fidelity",
    key: "brokerage",
    logoDomain: "fidelity.com",
    mask: "0044",
    name: "Individual Brokerage",
    subtype: "brokerage",
    type: "investment",
  },
  {
    balance: "21580.92",
    institutionName: "Fidelity",
    key: "roth_ira",
    logoDomain: "fidelity.com",
    mask: "5521",
    name: "Roth IRA",
    subtype: "roth ira",
    type: "investment",
  },
  {
    balance: "58420.55",
    institutionName: "Empower",
    key: "401k",
    logoDomain: "empower.com",
    mask: "8810",
    name: "Empower 401(k)",
    subtype: "401k",
    type: "investment",
  },

  // ── Liabilities ───────────────────────────────────────────────────
  {
    balance: "28310.00",
    institutionName: "Sallie Mae",
    key: "student_loan",
    logoDomain: "salliemae.com",
    mask: "3309",
    name: "Federal Student Loan",
    subtype: "student",
    type: "loan",
  },
];

/**
 * User-defined tags. Demo profile uses them to demonstrate the tagging surface:
 * - "work": reimbursable expenses awaiting an Expensify run
 * - "tax-deductible": HSA contribs, donations, business meals
 * - "lake-tahoe-2026": vacation grouping
 * - "side-project": indie-app SaaS costs
 * - "gift": presents bought (and the tax thereof)
 * - "subscription": all recurring streaming/services for easy filter
 */
export const DEMO_TAGS: DemoTagSeed[] = [
  { color: "blue", key: "work", name: "Work" },
  { color: "green", key: "tax_deductible", name: "Tax Deductible" },
  { color: "cyan", key: "tahoe", name: "Lake Tahoe 2026" },
  { color: "purple", key: "side_project", name: "Side Project" },
  { color: "pink", key: "gift", name: "Gift" },
  { color: "amber", key: "subscription", name: "Subscription" },
];

/**
 * ~180d of realistic transactions for a late-20s saver in SF.
 *
 * Sign convention follows Plaid: debit (money out) is positive, credit (money in) is
 * negative. Holds across all account types.
 *
 * Cadence:
 *   • Paycheck every 14 days (~$3,850 take-home)
 *   • Rent 1st of month ($2,100)
 *   • Utilities monthly (PG&E, Comcast, T-Mobile, water)
 *   • Streaming subs monthly (Netflix, Spotify, Disney+, NYT)
 *   • Groceries 1x/week
 *   • Coffee 3x/week, restaurants 2x/week
 *   • Savings transfer $500/2wk, 401k contrib via payroll (implicit), credit cards paid in full
 *   • One Tahoe trip 6 weeks ago (multi-day, tagged "tahoe")
 *   • Misc work reimbursables tagged "work", side-project SaaS tagged "side_project"
 */
export const DEMO_TXNS: DemoTxnSeed[] = [
  // ── Income: bi-weekly paychecks (~13 over 180d) ───────────────────
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 1,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 15,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 29,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 43,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 57,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 71,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 85,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 99,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 113,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 127,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 141,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 155,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  {
    accountKey: "checking",
    amount: "-3850.00",
    categoryKey: "paycheck",
    daysAgo: 169,
    merchantName: "Acme Corp",
    name: "ACME CORP PAYROLL",
  },
  // Side income — freelance design project, billed quarterly
  {
    accountKey: "checking",
    amount: "-1200.00",
    categoryKey: "freelance",
    daysAgo: 38,
    merchantName: "Stripe",
    name: "STRIPE TRANSFER — KOMALI DESIGN",
    notes: "Q1 retainer for the indie-app branding work.",
    tagKeys: ["side_project"],
  },
  {
    accountKey: "checking",
    amount: "-1800.00",
    categoryKey: "freelance",
    daysAgo: 128,
    merchantName: "Stripe",
    name: "STRIPE TRANSFER — KOMALI DESIGN",
    tagKeys: ["side_project"],
  },
  // Annual bonus
  {
    accountKey: "checking",
    amount: "-4200.00",
    categoryKey: "bonus",
    daysAgo: 92,
    merchantName: "Acme Corp",
    name: "ACME CORP — ANNUAL BONUS",
    notes: "Net after fed + CA tax withholding. Sent half straight to brokerage.",
  },
  // Interest from Ally
  {
    accountKey: "savings",
    amount: "-78.42",
    categoryKey: "interest_received",
    daysAgo: 30,
    merchantName: "Ally Bank",
    name: "INTEREST PAID",
  },
  {
    accountKey: "savings",
    amount: "-71.20",
    categoryKey: "interest_received",
    daysAgo: 60,
    merchantName: "Ally Bank",
    name: "INTEREST PAID",
  },
  {
    accountKey: "savings",
    amount: "-69.10",
    categoryKey: "interest_received",
    daysAgo: 90,
    merchantName: "Ally Bank",
    name: "INTEREST PAID",
  },
  {
    accountKey: "savings",
    amount: "-65.05",
    categoryKey: "interest_received",
    daysAgo: 120,
    merchantName: "Ally Bank",
    name: "INTEREST PAID",
  },
  {
    accountKey: "savings",
    amount: "-62.80",
    categoryKey: "interest_received",
    daysAgo: 150,
    merchantName: "Ally Bank",
    name: "INTEREST PAID",
  },

  // ── Rent: monthly ────────────────────────────────────────────────
  {
    accountKey: "checking",
    amount: "2100.00",
    categoryKey: "rent_mortgage",
    daysAgo: 3,
    merchantName: "Bayview Apartments",
    name: "BAYVIEW APTS RENT",
  },
  {
    accountKey: "checking",
    amount: "2100.00",
    categoryKey: "rent_mortgage",
    daysAgo: 33,
    merchantName: "Bayview Apartments",
    name: "BAYVIEW APTS RENT",
  },
  {
    accountKey: "checking",
    amount: "2100.00",
    categoryKey: "rent_mortgage",
    daysAgo: 63,
    merchantName: "Bayview Apartments",
    name: "BAYVIEW APTS RENT",
  },
  {
    accountKey: "checking",
    amount: "2100.00",
    categoryKey: "rent_mortgage",
    daysAgo: 93,
    merchantName: "Bayview Apartments",
    name: "BAYVIEW APTS RENT",
  },
  {
    accountKey: "checking",
    amount: "2100.00",
    categoryKey: "rent_mortgage",
    daysAgo: 123,
    merchantName: "Bayview Apartments",
    name: "BAYVIEW APTS RENT",
  },
  {
    accountKey: "checking",
    amount: "2100.00",
    categoryKey: "rent_mortgage",
    daysAgo: 153,
    merchantName: "Bayview Apartments",
    name: "BAYVIEW APTS RENT",
  },

  // ── Utilities: monthly ───────────────────────────────────────────
  {
    accountKey: "checking",
    amount: "84.22",
    categoryKey: "energy",
    daysAgo: 8,
    merchantName: "PG&E",
    name: "PG&E ELEC",
  },
  {
    accountKey: "checking",
    amount: "72.40",
    categoryKey: "energy",
    daysAgo: 38,
    merchantName: "PG&E",
    name: "PG&E ELEC",
  },
  {
    accountKey: "checking",
    amount: "68.10",
    categoryKey: "energy",
    daysAgo: 68,
    merchantName: "PG&E",
    name: "PG&E ELEC",
  },
  {
    accountKey: "checking",
    amount: "91.55",
    categoryKey: "energy",
    daysAgo: 98,
    merchantName: "PG&E",
    name: "PG&E ELEC",
    notes: "Heat-pump ran extra during cold snap.",
  },
  {
    accountKey: "checking",
    amount: "112.18",
    categoryKey: "energy",
    daysAgo: 128,
    merchantName: "PG&E",
    name: "PG&E ELEC",
  },
  {
    accountKey: "checking",
    amount: "98.04",
    categoryKey: "energy",
    daysAgo: 158,
    merchantName: "PG&E",
    name: "PG&E ELEC",
  },
  {
    accountKey: "checking",
    amount: "62.99",
    categoryKey: "internet",
    daysAgo: 12,
    merchantName: "Comcast",
    name: "COMCAST XFINITY",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "62.99",
    categoryKey: "internet",
    daysAgo: 42,
    merchantName: "Comcast",
    name: "COMCAST XFINITY",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "62.99",
    categoryKey: "internet",
    daysAgo: 72,
    merchantName: "Comcast",
    name: "COMCAST XFINITY",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "62.99",
    categoryKey: "internet",
    daysAgo: 102,
    merchantName: "Comcast",
    name: "COMCAST XFINITY",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "62.99",
    categoryKey: "internet",
    daysAgo: 132,
    merchantName: "Comcast",
    name: "COMCAST XFINITY",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "62.99",
    categoryKey: "internet",
    daysAgo: 162,
    merchantName: "Comcast",
    name: "COMCAST XFINITY",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "45.00",
    categoryKey: "phone",
    daysAgo: 20,
    merchantName: "T-Mobile",
    name: "T-MOBILE WIRELESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "45.00",
    categoryKey: "phone",
    daysAgo: 50,
    merchantName: "T-Mobile",
    name: "T-MOBILE WIRELESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "45.00",
    categoryKey: "phone",
    daysAgo: 80,
    merchantName: "T-Mobile",
    name: "T-MOBILE WIRELESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "45.00",
    categoryKey: "phone",
    daysAgo: 110,
    merchantName: "T-Mobile",
    name: "T-MOBILE WIRELESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "45.00",
    categoryKey: "phone",
    daysAgo: 140,
    merchantName: "T-Mobile",
    name: "T-MOBILE WIRELESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "45.00",
    categoryKey: "phone",
    daysAgo: 170,
    merchantName: "T-Mobile",
    name: "T-MOBILE WIRELESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "checking",
    amount: "32.18",
    categoryKey: "water",
    daysAgo: 25,
    merchantName: "SFPUC",
    name: "SF PUC WATER",
  },
  {
    accountKey: "checking",
    amount: "30.04",
    categoryKey: "water",
    daysAgo: 85,
    merchantName: "SFPUC",
    name: "SF PUC WATER",
  },
  {
    accountKey: "checking",
    amount: "31.20",
    categoryKey: "water",
    daysAgo: 145,
    merchantName: "SFPUC",
    name: "SF PUC WATER",
  },

  // ── Streaming + recurring subs ────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    amount: "15.99",
    categoryKey: "streaming",
    daysAgo: 4,
    merchantName: "Netflix",
    name: "NETFLIX.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "15.99",
    categoryKey: "streaming",
    daysAgo: 34,
    merchantName: "Netflix",
    name: "NETFLIX.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "15.99",
    categoryKey: "streaming",
    daysAgo: 64,
    merchantName: "Netflix",
    name: "NETFLIX.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "15.99",
    categoryKey: "streaming",
    daysAgo: 94,
    merchantName: "Netflix",
    name: "NETFLIX.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "15.99",
    categoryKey: "streaming",
    daysAgo: 124,
    merchantName: "Netflix",
    name: "NETFLIX.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "15.99",
    categoryKey: "streaming",
    daysAgo: 154,
    merchantName: "Netflix",
    name: "NETFLIX.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "10.99",
    categoryKey: "streaming",
    daysAgo: 7,
    merchantName: "Spotify",
    name: "SPOTIFY USA",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "10.99",
    categoryKey: "streaming",
    daysAgo: 37,
    merchantName: "Spotify",
    name: "SPOTIFY USA",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "10.99",
    categoryKey: "streaming",
    daysAgo: 67,
    merchantName: "Spotify",
    name: "SPOTIFY USA",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "10.99",
    categoryKey: "streaming",
    daysAgo: 97,
    merchantName: "Spotify",
    name: "SPOTIFY USA",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "10.99",
    categoryKey: "streaming",
    daysAgo: 127,
    merchantName: "Spotify",
    name: "SPOTIFY USA",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "10.99",
    categoryKey: "streaming",
    daysAgo: 157,
    merchantName: "Spotify",
    name: "SPOTIFY USA",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "12.99",
    categoryKey: "streaming",
    daysAgo: 14,
    merchantName: "Disney+",
    name: "DISNEY PLUS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "12.99",
    categoryKey: "streaming",
    daysAgo: 44,
    merchantName: "Disney+",
    name: "DISNEY PLUS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "12.99",
    categoryKey: "streaming",
    daysAgo: 74,
    merchantName: "Disney+",
    name: "DISNEY PLUS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "17.00",
    categoryKey: "books_media",
    daysAgo: 11,
    merchantName: "The New York Times",
    name: "NYTIMES.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "17.00",
    categoryKey: "books_media",
    daysAgo: 41,
    merchantName: "The New York Times",
    name: "NYTIMES.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "17.00",
    categoryKey: "books_media",
    daysAgo: 71,
    merchantName: "The New York Times",
    name: "NYTIMES.COM",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "17.00",
    categoryKey: "books_media",
    daysAgo: 101,
    merchantName: "The New York Times",
    name: "NYTIMES.COM",
    tagKeys: ["subscription"],
  },

  // ── Coffee (3x/week heavy concentration recent) ───────────────────
  {
    accountKey: "credit_sapphire",
    address: "66 Mint St",
    amount: "5.45",
    categoryKey: "coffee_shop",
    city: "San Francisco",
    country: "US",
    daysAgo: 0,
    lat: 37.7822,
    lon: -122.4075,
    merchantName: "Blue Bottle",
    name: "BLUE BOTTLE COFFEE",
    postalCode: "94103",
    region: "CA",
  },
  {
    accountKey: "credit_sapphire",
    address: "333 Market St",
    amount: "6.20",
    categoryKey: "coffee_shop",
    city: "San Francisco",
    country: "US",
    daysAgo: 2,
    lat: 37.7937,
    lon: -122.3962,
    merchantName: "Starbucks",
    name: "STARBUCKS #4421",
    postalCode: "94105",
    region: "CA",
  },
  {
    accountKey: "credit_sapphire",
    amount: "4.75",
    categoryKey: "coffee_shop",
    city: "San Francisco",
    country: "US",
    daysAgo: 5,
    merchantName: "Blue Bottle",
    name: "BLUE BOTTLE COFFEE",
    region: "CA",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.85",
    categoryKey: "coffee_shop",
    daysAgo: 9,
    merchantName: "Sightglass",
    name: "SIGHTGLASS COFFEE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "6.10",
    categoryKey: "coffee_shop",
    daysAgo: 12,
    merchantName: "Starbucks",
    name: "STARBUCKS #4421",
  },
  {
    accountKey: "credit_sapphire",
    amount: "4.95",
    categoryKey: "coffee_shop",
    daysAgo: 16,
    merchantName: "Blue Bottle",
    name: "BLUE BOTTLE COFFEE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.50",
    categoryKey: "coffee_shop",
    daysAgo: 21,
    merchantName: "Ritual",
    name: "RITUAL COFFEE ROASTERS",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.25",
    categoryKey: "coffee_shop",
    daysAgo: 26,
    merchantName: "Sightglass",
    name: "SIGHTGLASS COFFEE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.45",
    categoryKey: "coffee_shop",
    daysAgo: 32,
    merchantName: "Blue Bottle",
    name: "BLUE BOTTLE COFFEE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "6.40",
    categoryKey: "coffee_shop",
    daysAgo: 40,
    merchantName: "Starbucks",
    name: "STARBUCKS #4421",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.10",
    categoryKey: "coffee_shop",
    daysAgo: 55,
    merchantName: "Sightglass",
    name: "SIGHTGLASS COFFEE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "4.85",
    categoryKey: "coffee_shop",
    daysAgo: 73,
    merchantName: "Blue Bottle",
    name: "BLUE BOTTLE COFFEE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.95",
    categoryKey: "coffee_shop",
    daysAgo: 88,
    merchantName: "Ritual",
    name: "RITUAL COFFEE ROASTERS",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.50",
    categoryKey: "coffee_shop",
    daysAgo: 105,
    merchantName: "Sightglass",
    name: "SIGHTGLASS COFFEE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.20",
    categoryKey: "coffee_shop",
    daysAgo: 130,
    merchantName: "Blue Bottle",
    name: "BLUE BOTTLE COFFEE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "5.40",
    categoryKey: "coffee_shop",
    daysAgo: 152,
    merchantName: "Starbucks",
    name: "STARBUCKS #4421",
  },

  // ── Restaurants ───────────────────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    address: "600 Guerrero St",
    amount: "42.18",
    categoryKey: "restaurants",
    city: "San Francisco",
    country: "US",
    daysAgo: 1,
    lat: 37.7615,
    lon: -122.4243,
    merchantName: "Tartine",
    name: "TARTINE BAKERY",
    notes: "Sunday brunch with Priya.",
    postalCode: "94110",
    region: "CA",
  },
  {
    accountKey: "credit_sapphire",
    address: "2234 Mission St",
    amount: "68.40",
    categoryKey: "restaurants",
    city: "San Francisco",
    country: "US",
    daysAgo: 6,
    lat: 37.7611,
    lon: -122.4195,
    merchantName: "Mission Chinese",
    name: "MISSION CHINESE FOOD",
    postalCode: "94110",
    region: "CA",
  },
  {
    accountKey: "credit_amex",
    amount: "118.30",
    categoryKey: "restaurants",
    daysAgo: 10,
    merchantName: "State Bird Provisions",
    name: "STATE BIRD PROVISIONS",
    notes: "Acme team dinner — Mike to expense via Brex.",
  },
  {
    accountKey: "credit_sapphire",
    amount: "54.80",
    categoryKey: "restaurants",
    daysAgo: 13,
    merchantName: "Burma Superstar",
    name: "BURMA SUPERSTAR",
  },
  {
    accountKey: "credit_sapphire",
    amount: "38.20",
    categoryKey: "restaurants",
    daysAgo: 19,
    merchantName: "Souvla",
    name: "SOUVLA HAYES VALLEY",
  },
  {
    accountKey: "credit_amex",
    amount: "95.50",
    categoryKey: "restaurants",
    daysAgo: 24,
    merchantName: "Nopa",
    name: "NOPA SF",
    notes: "Vendor lunch with Datadog AE, reimbursable.",
    tagKeys: ["work"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "47.10",
    categoryKey: "restaurants",
    daysAgo: 31,
    merchantName: "Zuni Cafe",
    name: "ZUNI CAFE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "62.80",
    categoryKey: "restaurants",
    daysAgo: 47,
    merchantName: "Foreign Cinema",
    name: "FOREIGN CINEMA",
  },
  {
    accountKey: "credit_sapphire",
    amount: "33.50",
    categoryKey: "restaurants",
    daysAgo: 70,
    merchantName: "Loving Cup",
    name: "LOVING CUP",
  },
  {
    accountKey: "credit_amex",
    amount: "144.20",
    categoryKey: "restaurants",
    daysAgo: 100,
    merchantName: "Lazy Bear",
    name: "LAZY BEAR SF",
    notes: "Anniversary dinner — worth every penny.",
  },

  // ── Food delivery ─────────────────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    amount: "31.80",
    categoryKey: "food_delivery",
    daysAgo: 9,
    merchantName: "DoorDash",
    name: "DOORDASH",
  },
  {
    accountKey: "credit_sapphire",
    amount: "28.40",
    categoryKey: "food_delivery",
    daysAgo: 22,
    merchantName: "Caviar",
    name: "CAVIAR DELIVERY",
  },
  {
    accountKey: "credit_sapphire",
    amount: "44.10",
    categoryKey: "food_delivery",
    daysAgo: 36,
    merchantName: "DoorDash",
    name: "DOORDASH",
  },
  {
    accountKey: "credit_sapphire",
    amount: "26.75",
    categoryKey: "food_delivery",
    daysAgo: 58,
    merchantName: "Uber Eats",
    name: "UBER EATS",
  },
  {
    accountKey: "credit_sapphire",
    amount: "39.90",
    categoryKey: "food_delivery",
    daysAgo: 91,
    merchantName: "DoorDash",
    name: "DOORDASH",
  },

  // ── Groceries (weekly) ────────────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    address: "399 4th St",
    amount: "112.43",
    categoryKey: "groceries",
    city: "San Francisco",
    country: "US",
    daysAgo: 3,
    lat: 37.7799,
    lon: -122.3998,
    merchantName: "Whole Foods",
    name: "WHOLE FOODS MARKET",
    postalCode: "94107",
    region: "CA",
  },
  {
    accountKey: "credit_sapphire",
    amount: "87.92",
    categoryKey: "groceries",
    daysAgo: 11,
    merchantName: "Trader Joe's",
    name: "TRADER JOE'S",
  },
  {
    accountKey: "credit_sapphire",
    amount: "96.18",
    categoryKey: "groceries",
    daysAgo: 18,
    merchantName: "Whole Foods",
    name: "WHOLE FOODS MARKET",
  },
  {
    accountKey: "credit_sapphire",
    amount: "78.45",
    categoryKey: "groceries",
    daysAgo: 25,
    merchantName: "Trader Joe's",
    name: "TRADER JOE'S",
  },
  {
    accountKey: "credit_sapphire",
    amount: "104.80",
    categoryKey: "groceries",
    daysAgo: 32,
    merchantName: "Whole Foods",
    name: "WHOLE FOODS MARKET",
  },
  {
    accountKey: "credit_sapphire",
    amount: "91.30",
    categoryKey: "groceries",
    daysAgo: 40,
    merchantName: "Trader Joe's",
    name: "TRADER JOE'S",
  },
  {
    accountKey: "credit_sapphire",
    amount: "118.92",
    categoryKey: "groceries",
    daysAgo: 53,
    merchantName: "Whole Foods",
    name: "WHOLE FOODS MARKET",
  },
  {
    accountKey: "credit_sapphire",
    amount: "82.15",
    categoryKey: "groceries",
    daysAgo: 68,
    merchantName: "Trader Joe's",
    name: "TRADER JOE'S",
  },
  {
    accountKey: "credit_sapphire",
    amount: "95.50",
    categoryKey: "groceries",
    daysAgo: 82,
    merchantName: "Whole Foods",
    name: "WHOLE FOODS MARKET",
  },
  {
    accountKey: "credit_sapphire",
    amount: "108.20",
    categoryKey: "groceries",
    daysAgo: 110,
    merchantName: "Whole Foods",
    name: "WHOLE FOODS MARKET",
  },
  {
    accountKey: "credit_sapphire",
    amount: "89.40",
    categoryKey: "groceries",
    daysAgo: 135,
    merchantName: "Trader Joe's",
    name: "TRADER JOE'S",
  },
  {
    accountKey: "credit_sapphire",
    amount: "76.50",
    categoryKey: "groceries",
    daysAgo: 161,
    merchantName: "Trader Joe's",
    name: "TRADER JOE'S",
  },

  // ── Transport ─────────────────────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    amount: "18.40",
    categoryKey: "taxi",
    daysAgo: 2,
    merchantName: "Uber",
    name: "UBER TRIP",
  },
  {
    accountKey: "credit_sapphire",
    amount: "11.25",
    categoryKey: "taxi",
    daysAgo: 8,
    merchantName: "Lyft",
    name: "LYFT *RIDE",
  },
  {
    accountKey: "credit_sapphire",
    amount: "22.10",
    categoryKey: "taxi",
    daysAgo: 17,
    merchantName: "Uber",
    name: "UBER TRIP",
  },
  {
    accountKey: "credit_sapphire",
    amount: "14.80",
    categoryKey: "taxi",
    daysAgo: 28,
    merchantName: "Lyft",
    name: "LYFT *RIDE",
  },
  {
    accountKey: "credit_amex",
    amount: "31.50",
    categoryKey: "taxi",
    daysAgo: 45,
    merchantName: "Uber",
    name: "UBER TRIP",
    notes: "Ride home from late office on-call.",
    tagKeys: ["work"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "16.90",
    categoryKey: "taxi",
    daysAgo: 76,
    merchantName: "Uber",
    name: "UBER TRIP",
  },
  {
    accountKey: "credit_sapphire",
    amount: "54.10",
    categoryKey: "gas_fuel",
    daysAgo: 15,
    merchantName: "Shell",
    name: "SHELL OIL",
  },
  {
    accountKey: "credit_sapphire",
    amount: "48.30",
    categoryKey: "gas_fuel",
    daysAgo: 51,
    merchantName: "Chevron",
    name: "CHEVRON GAS",
  },
  {
    accountKey: "credit_sapphire",
    amount: "62.40",
    categoryKey: "gas_fuel",
    daysAgo: 105,
    merchantName: "Shell",
    name: "SHELL OIL",
    notes: "Drive up to Tahoe — refilled in Auburn.",
    tagKeys: ["tahoe"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "8.00",
    categoryKey: "toll",
    daysAgo: 105,
    merchantName: "FasTrak",
    name: "FASTRAK BAY BRIDGE",
    tagKeys: ["tahoe"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "8.00",
    categoryKey: "toll",
    daysAgo: 103,
    merchantName: "FasTrak",
    name: "FASTRAK BAY BRIDGE",
    notes: "Drive home.",
    tagKeys: ["tahoe"],
  },

  // ── Tahoe trip (cluster 103-105 days ago) ─────────────────────────
  {
    accountKey: "credit_amex",
    amount: "412.00",
    categoryKey: "hotels",
    city: "Truckee",
    country: "US",
    daysAgo: 104,
    lat: 39.3279,
    lon: -120.1827,
    merchantName: "Airbnb",
    name: "AIRBNB INC",
    notes: "Cabin near Truckee, 2 nights.",
    postalCode: "96161",
    region: "CA",
    tagKeys: ["tahoe"],
  },
  {
    accountKey: "credit_sapphire",
    address: "10007 Bridge St",
    amount: "189.50",
    categoryKey: "restaurants",
    city: "Truckee",
    country: "US",
    daysAgo: 104,
    lat: 39.3284,
    lon: -120.1837,
    merchantName: "Moody's",
    name: "MOODY'S TRUCKEE",
    postalCode: "96161",
    region: "CA",
    tagKeys: ["tahoe"],
  },
  {
    accountKey: "credit_sapphire",
    address: "11260 Donner Pass Rd",
    amount: "76.40",
    categoryKey: "groceries",
    city: "Truckee",
    country: "US",
    daysAgo: 104,
    lat: 39.3296,
    lon: -120.1991,
    merchantName: "Safeway",
    name: "SAFEWAY TRUCKEE",
    postalCode: "96161",
    region: "CA",
    tagKeys: ["tahoe"],
  },
  {
    accountKey: "credit_sapphire",
    address: "1960 Squaw Valley Rd",
    amount: "245.00",
    categoryKey: "event",
    city: "Olympic Valley",
    country: "US",
    daysAgo: 104,
    lat: 39.1969,
    lon: -120.2358,
    merchantName: "Palisades Tahoe",
    name: "PALISADES TAHOE LIFT",
    notes: "Day pass for two.",
    postalCode: "96146",
    region: "CA",
    tagKeys: ["tahoe"],
  },

  // ── Shopping ──────────────────────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    amount: "47.99",
    categoryKey: "shopping",
    daysAgo: 4,
    merchantName: "Amazon",
    name: "AMAZON.COM",
  },
  {
    accountKey: "credit_sapphire",
    amount: "23.80",
    categoryKey: "shopping",
    daysAgo: 17,
    merchantName: "Amazon",
    name: "AMAZON.COM",
  },
  {
    accountKey: "credit_sapphire",
    amount: "129.00",
    categoryKey: "clothing",
    daysAgo: 22,
    merchantName: "Uniqlo",
    name: "UNIQLO USA",
  },
  {
    accountKey: "credit_amex",
    amount: "84.50",
    categoryKey: "clothing",
    daysAgo: 46,
    merchantName: "Everlane",
    name: "EVERLANE INC",
  },
  {
    accountKey: "credit_sapphire",
    amount: "62.10",
    categoryKey: "electronics",
    daysAgo: 81,
    merchantName: "Apple",
    name: "APPLE.COM/BILL",
    notes: "iCloud+ 2TB annual.",
  },
  {
    accountKey: "credit_amex",
    amount: "215.00",
    categoryKey: "gift",
    daysAgo: 35,
    merchantName: "Goorin Bros",
    name: "GOORIN BROS HAT SHOP",
    notes: "Mom's birthday.",
    tagKeys: ["gift"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "78.20",
    categoryKey: "gift",
    daysAgo: 92,
    merchantName: "Bookshop.org",
    name: "BOOKSHOP.ORG",
    tagKeys: ["gift"],
  },

  // ── Fitness + personal care ───────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    amount: "29.00",
    categoryKey: "fitness",
    daysAgo: 5,
    merchantName: "Equinox",
    name: "EQUINOX FITNESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "29.00",
    categoryKey: "fitness",
    daysAgo: 35,
    merchantName: "Equinox",
    name: "EQUINOX FITNESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "29.00",
    categoryKey: "fitness",
    daysAgo: 65,
    merchantName: "Equinox",
    name: "EQUINOX FITNESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "29.00",
    categoryKey: "fitness",
    daysAgo: 95,
    merchantName: "Equinox",
    name: "EQUINOX FITNESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "29.00",
    categoryKey: "fitness",
    daysAgo: 125,
    merchantName: "Equinox",
    name: "EQUINOX FITNESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "29.00",
    categoryKey: "fitness",
    daysAgo: 155,
    merchantName: "Equinox",
    name: "EQUINOX FITNESS",
    tagKeys: ["subscription"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "65.00",
    categoryKey: "hair_beauty",
    daysAgo: 39,
    merchantName: "Peoples Barber",
    name: "PEOPLES BARBER SHOP",
  },
  {
    accountKey: "credit_sapphire",
    amount: "65.00",
    categoryKey: "hair_beauty",
    daysAgo: 89,
    merchantName: "Peoples Barber",
    name: "PEOPLES BARBER SHOP",
  },

  // ── Medical ───────────────────────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    amount: "42.00",
    categoryKey: "pharmacy",
    daysAgo: 27,
    merchantName: "Walgreens",
    name: "WALGREENS #1023",
  },
  {
    accountKey: "credit_sapphire",
    amount: "30.00",
    categoryKey: "primary",
    daysAgo: 86,
    merchantName: "One Medical",
    name: "ONE MEDICAL COPAY",
    notes: "Annual physical copay.",
  },
  {
    accountKey: "credit_sapphire",
    amount: "180.00",
    categoryKey: "dental",
    daysAgo: 142,
    merchantName: "Mission Dental",
    name: "MISSION DENTAL CLEANING",
  },

  // ── Side project / SaaS ───────────────────────────────────────────
  {
    accountKey: "credit_amex",
    amount: "20.00",
    categoryKey: "financial_service",
    daysAgo: 9,
    merchantName: "Vercel",
    name: "VERCEL INC",
    notes: "Hobby plan for the indie app.",
    tagKeys: ["side_project", "subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "20.00",
    categoryKey: "financial_service",
    daysAgo: 39,
    merchantName: "Vercel",
    name: "VERCEL INC",
    tagKeys: ["side_project", "subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "20.00",
    categoryKey: "financial_service",
    daysAgo: 69,
    merchantName: "Vercel",
    name: "VERCEL INC",
    tagKeys: ["side_project", "subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "29.00",
    categoryKey: "financial_service",
    daysAgo: 14,
    merchantName: "Linear",
    name: "LINEAR ORBIT INC",
    tagKeys: ["side_project", "subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "29.00",
    categoryKey: "financial_service",
    daysAgo: 44,
    merchantName: "Linear",
    name: "LINEAR ORBIT INC",
    tagKeys: ["side_project", "subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "12.99",
    categoryKey: "financial_service",
    daysAgo: 20,
    merchantName: "OpenAI",
    name: "OPENAI.COM",
    tagKeys: ["side_project", "subscription"],
  },
  {
    accountKey: "credit_amex",
    amount: "12.99",
    categoryKey: "financial_service",
    daysAgo: 50,
    merchantName: "OpenAI",
    name: "OPENAI.COM",
    tagKeys: ["side_project", "subscription"],
  },

  // ── Charity / taxes / fees ────────────────────────────────────────
  {
    accountKey: "checking",
    amount: "200.00",
    categoryKey: "donations",
    daysAgo: 60,
    merchantName: "Wikipedia",
    name: "WIKIMEDIA FOUNDATION",
    notes: "End-of-year recurring donation.",
    tagKeys: ["tax_deductible"],
  },
  {
    accountKey: "checking",
    amount: "150.00",
    categoryKey: "donations",
    daysAgo: 90,
    merchantName: "Doctors Without Borders",
    name: "MSF DONATION",
    tagKeys: ["tax_deductible"],
  },
  {
    accountKey: "credit_sapphire",
    amount: "32.18",
    categoryKey: "foreign_transaction",
    daysAgo: 47,
    merchantName: "Chase",
    name: "FOREIGN TRANSACTION FEE",
    notes: "From iCloud charge billed in EUR; revisit.",
  },

  // ── Transfers + payments ──────────────────────────────────────────
  // Savings transfers (bi-weekly $500)
  {
    accountKey: "checking",
    amount: "500.00",
    categoryKey: "savings_transfer",
    daysAgo: 2,
    name: "TRANSFER TO ALLY SAVINGS",
  },
  {
    accountKey: "savings",
    amount: "-500.00",
    categoryKey: "savings_transfer",
    daysAgo: 2,
    name: "TRANSFER FROM CHASE CHECKING",
  },
  {
    accountKey: "checking",
    amount: "500.00",
    categoryKey: "savings_transfer",
    daysAgo: 16,
    name: "TRANSFER TO ALLY SAVINGS",
  },
  {
    accountKey: "savings",
    amount: "-500.00",
    categoryKey: "savings_transfer",
    daysAgo: 16,
    name: "TRANSFER FROM CHASE CHECKING",
  },
  {
    accountKey: "checking",
    amount: "500.00",
    categoryKey: "savings_transfer",
    daysAgo: 44,
    name: "TRANSFER TO ALLY SAVINGS",
  },
  {
    accountKey: "savings",
    amount: "-500.00",
    categoryKey: "savings_transfer",
    daysAgo: 44,
    name: "TRANSFER FROM CHASE CHECKING",
  },
  {
    accountKey: "checking",
    amount: "500.00",
    categoryKey: "savings_transfer",
    daysAgo: 72,
    name: "TRANSFER TO ALLY SAVINGS",
  },
  {
    accountKey: "savings",
    amount: "-500.00",
    categoryKey: "savings_transfer",
    daysAgo: 72,
    name: "TRANSFER FROM CHASE CHECKING",
  },
  {
    accountKey: "checking",
    amount: "500.00",
    categoryKey: "savings_transfer",
    daysAgo: 100,
    name: "TRANSFER TO ALLY SAVINGS",
  },
  {
    accountKey: "savings",
    amount: "-500.00",
    categoryKey: "savings_transfer",
    daysAgo: 100,
    name: "TRANSFER FROM CHASE CHECKING",
  },
  // Investment transfer (brokerage)
  {
    accountKey: "checking",
    amount: "2000.00",
    categoryKey: "investment_transfer",
    daysAgo: 91,
    name: "TRANSFER TO FIDELITY",
    notes: "Half of bonus → VTI/VXUS.",
  },
  {
    accountKey: "brokerage",
    amount: "-2000.00",
    categoryKey: "investment_transfer",
    daysAgo: 91,
    name: "TRANSFER FROM CHASE CHECKING",
  },
  // Sapphire CC payment (pay-in-full monthly)
  {
    accountKey: "checking",
    amount: "950.00",
    categoryKey: "credit_card_payment",
    daysAgo: 16,
    name: "CHASE CREDIT CARD PAYMENT",
  },
  {
    accountKey: "credit_sapphire",
    amount: "-950.00",
    categoryKey: "credit_card_payment",
    daysAgo: 16,
    name: "PAYMENT THANK YOU",
  },
  {
    accountKey: "checking",
    amount: "1120.00",
    categoryKey: "credit_card_payment",
    daysAgo: 46,
    name: "CHASE CREDIT CARD PAYMENT",
  },
  {
    accountKey: "credit_sapphire",
    amount: "-1120.00",
    categoryKey: "credit_card_payment",
    daysAgo: 46,
    name: "PAYMENT THANK YOU",
  },
  {
    accountKey: "checking",
    amount: "1340.00",
    categoryKey: "credit_card_payment",
    daysAgo: 76,
    name: "CHASE CREDIT CARD PAYMENT",
  },
  {
    accountKey: "credit_sapphire",
    amount: "-1340.00",
    categoryKey: "credit_card_payment",
    daysAgo: 76,
    name: "PAYMENT THANK YOU",
  },
  // Amex CC payment
  {
    accountKey: "checking",
    amount: "640.00",
    categoryKey: "credit_card_payment",
    daysAgo: 18,
    name: "AMEX EPAY",
  },
  {
    accountKey: "credit_amex",
    amount: "-640.00",
    categoryKey: "credit_card_payment",
    daysAgo: 18,
    name: "PAYMENT — THANK YOU",
  },
  {
    accountKey: "checking",
    amount: "510.00",
    categoryKey: "credit_card_payment",
    daysAgo: 48,
    name: "AMEX EPAY",
  },
  {
    accountKey: "credit_amex",
    amount: "-510.00",
    categoryKey: "credit_card_payment",
    daysAgo: 48,
    name: "PAYMENT — THANK YOU",
  },
  // Student loan (monthly)
  {
    accountKey: "checking",
    amount: "385.00",
    categoryKey: "student_loan",
    daysAgo: 5,
    merchantName: "Sallie Mae",
    name: "SALLIE MAE LOAN PMT",
  },
  {
    accountKey: "checking",
    amount: "385.00",
    categoryKey: "student_loan",
    daysAgo: 35,
    merchantName: "Sallie Mae",
    name: "SALLIE MAE LOAN PMT",
  },
  {
    accountKey: "checking",
    amount: "385.00",
    categoryKey: "student_loan",
    daysAgo: 65,
    merchantName: "Sallie Mae",
    name: "SALLIE MAE LOAN PMT",
  },
  {
    accountKey: "checking",
    amount: "385.00",
    categoryKey: "student_loan",
    daysAgo: 95,
    merchantName: "Sallie Mae",
    name: "SALLIE MAE LOAN PMT",
  },
  {
    accountKey: "checking",
    amount: "385.00",
    categoryKey: "student_loan",
    daysAgo: 125,
    merchantName: "Sallie Mae",
    name: "SALLIE MAE LOAN PMT",
  },
  {
    accountKey: "checking",
    amount: "385.00",
    categoryKey: "student_loan",
    daysAgo: 155,
    merchantName: "Sallie Mae",
    name: "SALLIE MAE LOAN PMT",
  },

  // ── Pending ───────────────────────────────────────────────────────
  {
    accountKey: "credit_sapphire",
    amount: "8.50",
    categoryKey: "coffee_shop",
    daysAgo: 0,
    merchantName: "Sightglass",
    name: "SIGHTGLASS COFFEE",
    pending: true,
  },
  {
    accountKey: "credit_amex",
    amount: "62.40",
    categoryKey: "restaurants",
    daysAgo: 0,
    merchantName: "Anchor Oyster Bar",
    name: "ANCHOR OYSTER BAR",
    notes: "Pending — should clear tomorrow.",
    pending: true,
  },
];

/**
 * Holdings designed to roughly hit each investment account's stated balance:
 *   brokerage  ~$42,137 — 3-fund + 3 single-name tilts (1 winner, 1 small loss)
 *   roth_ira   ~$21,581 — boring 3-fund (VTI / VXUS / BND)
 *   401k       ~$58,421 — Empower lineup: target-date + total market + intl
 *
 * costBasis = total paid, not per-share. (price - costBasis/quantity) = unrealized.
 */
/**
 * Sample agent threads. Seeded so the AI chat tab is populated when a demo user
 * lands. Replies are static fixture text — no live model call. If the user
 * sends a new message, the real agent picks up from there.
 */
export const DEMO_CHATS: DemoChatSeed[] = [
  {
    daysAgo: 0,
    messages: [
      { minutesAgo: 45, role: "user", text: "How much did I spend on coffee this month?" },
      {
        minutesAgo: 44,
        role: "assistant",
        text: "You spent **$58.20 on coffee in the last 30 days** across 11 visits, averaging $5.29 per cup. Blue Bottle was the most frequent (5 visits), followed by Starbucks (3) and Sightglass (3).\n\nThat's tracking $19 higher than the prior 30-day window. Want me to set a $50/mo coffee budget?",
      },
      { minutesAgo: 43, role: "user", text: "How does that compare to my groceries?" },
      {
        minutesAgo: 42,
        role: "assistant",
        text: "Groceries were **$487.18 last 30 days** (4 trips). So coffee is ~12% of your grocery spend, which is on the higher side — most of your peers come in at 5–7%.\n\nThe pattern is mostly weekday mornings, which suggests an office routine rather than weekend leisure spend.",
      },
    ],
    title: "Coffee spend this month",
  },
  {
    daysAgo: 4,
    messages: [
      { minutesAgo: 60, role: "user", text: "Am I on track to hit my savings goal?" },
      {
        minutesAgo: 59,
        role: "assistant",
        text: "You're contributing **$500 every two weeks to Ally** ($1,083/mo) plus the bi-weekly 401(k) contribution via payroll. At this pace you'll hit $30k in the HYSA by mid-November.\n\nOne thing worth flagging: your Tahoe trip last month added $940 to credit card balances. If you keep the $500 cadence and pay both cards in full, the trip won't dent the savings runway.",
      },
      { minutesAgo: 58, role: "user", text: "What if I bumped it to $600 per paycheck?" },
      {
        minutesAgo: 57,
        role: "assistant",
        text: "$600 every two weeks = $1,300/mo. You'd hit $30k by **mid-October instead of mid-November** — about 4 weeks sooner.\n\nYour current monthly cash flow runs ~$1,650 positive after rent, transfers, and credit-card payoff, so an extra $200/paycheck is comfortable. Want me to draft the change for your bank instructions?",
      },
    ],
    title: "Savings goal check-in",
  },
  {
    daysAgo: 1,
    messages: [
      { minutesAgo: 30, role: "user", text: "Where is most of my dining spend going?" },
      {
        minutesAgo: 29,
        role: "assistant",
        text: "Last 30 days you spent **$612.40 across 18 dining transactions**. Top three: Anchor Oyster Bar ($142), Tartine ($98), Mission Chinese ($87). Weekends account for 68% of dollars but only 40% of visits — weeknight dinners are smaller tabs.",
      },
    ],
    title: "Dining breakdown",
  },
  {
    daysAgo: 2,
    messages: [
      { minutesAgo: 120, role: "user", text: "How much cash do I have across all accounts?" },
      {
        minutesAgo: 119,
        role: "assistant",
        text: "Total liquid cash: **$34,812**. Breakdown:\n- Chase Checking: $4,231\n- Ally HYSA: $28,140\n- Apple Cash: $2,441\n\nYour HYSA is earning 4.25% APY — about $99/mo in interest at the current balance.",
      },
    ],
    title: "Cash position",
  },
  {
    daysAgo: 3,
    messages: [
      { minutesAgo: 15, role: "user", text: "Am I overweight tech in my brokerage?" },
      {
        minutesAgo: 14,
        role: "assistant",
        text: "Yes — **~74% of your taxable brokerage is mega-cap tech** (AAPL, NVDA, MSFT, GOOGL, META, AMZN, TSLA, TSM). For comparison, the S&P 500's tech weighting is ~32%.\n\nNot inherently bad if intentional, but the correlation between these names is high — a sector drawdown hits the whole sleeve at once. Want suggestions to diversify with broad-market ETFs?",
      },
    ],
    title: "Brokerage concentration",
  },
  {
    daysAgo: 5,
    messages: [
      { minutesAgo: 90, role: "user", text: "What recurring subscriptions am I paying for?" },
      {
        minutesAgo: 89,
        role: "assistant",
        text: "Found **9 active recurring charges** totaling $187.45/mo:\n- Netflix $22.99\n- Spotify $11.99\n- NYT $17.00\n- iCloud+ $9.99\n- ChatGPT Plus $20.00\n- Claude Pro $20.00\n- Linear $8.00\n- 1Password $4.99\n- Gym $72.49\n\nNothing duplicated. ChatGPT + Claude is the biggest discretionary overlap — drop one for $20/mo savings.",
      },
    ],
    title: "Subscription audit",
  },
  {
    daysAgo: 7,
    messages: [
      { minutesAgo: 200, role: "user", text: "How's my credit card utilization?" },
      {
        minutesAgo: 199,
        role: "assistant",
        text: "Combined utilization: **18%** ($2,340 balances / $13,000 total limit).\n- Chase Sapphire: 22% ($1,540 / $7k)\n- Amex Gold: 16% ($800 / $5k — no preset limit, using pay-over-time)\n\nUnder 30% is the FICO sweet spot; you're fine. Sapphire is closest to the threshold — pay $150 there before statement close to drop to 20%.",
      },
    ],
    title: "Credit utilization",
  },
  {
    daysAgo: 10,
    messages: [
      { minutesAgo: 5, role: "user", text: "Did my 401k contribution go through this paycheck?" },
      {
        minutesAgo: 4,
        role: "assistant",
        text: "Yes — **$615.38 contribution posted 3 days ago** to your Empower 401(k). YTD contributions are $14,769, putting you on pace for $19,200 by year-end (vs $23,000 IRS limit).\n\nYou have headroom to bump deferral 4% if you want to max it.",
      },
    ],
    title: "401k contribution check",
  },
  {
    daysAgo: 12,
    messages: [
      { minutesAgo: 60, role: "user", text: "How much did the Tahoe trip cost?" },
      {
        minutesAgo: 59,
        role: "assistant",
        text: "Tahoe trip (Aug 14–18) totaled **$1,247.30** across 14 transactions:\n- Lodging (Airbnb): $620.00\n- Gas (4 fills): $182.40\n- Restaurants: $284.50\n- Groceries (Safeway): $96.20\n- Activities (ski rental, lift): $64.20\n\n~$940 hit credit cards; the rest came out of checking.",
      },
    ],
    title: "Tahoe trip cost",
  },
  {
    daysAgo: 15,
    messages: [
      { minutesAgo: 25, role: "user", text: "What's my real take-home after taxes and benefits?" },
      {
        minutesAgo: 24,
        role: "assistant",
        text: "Average net deposit over the last 6 paychecks: **$4,820 bi-weekly** = ~$10,444/mo. That's after federal + CA state withholding, FICA, $615 401k, and $185 health/dental.\n\nGross is roughly $7,100/paycheck, so your effective deduction rate is ~32%.",
      },
    ],
    title: "Take-home pay",
  },
  {
    daysAgo: 18,
    messages: [
      { minutesAgo: 45, role: "user", text: "Any unusual charges in the last week?" },
      {
        minutesAgo: 44,
        role: "assistant",
        text: 'Two stood out:\n1. **$89.00 at "PYP*UNKNOWN MERCHANT"** (PayPal) on 9/12 — no merchant string, no prior history. Worth checking.\n2. **$42.18 Lyft on 9/14 at 3:14am** — outside your usual ride pattern.\n\nEverything else looked routine.',
      },
    ],
    title: "Unusual charges scan",
  },
  {
    daysAgo: 22,
    messages: [
      {
        minutesAgo: 75,
        role: "user",
        text: "If I want to buy a house in 3 years, am I on track for a down payment?",
      },
      {
        minutesAgo: 74,
        role: "assistant",
        text: "Assuming **$150k down on an $850k home** (SF metro), and your current $1,083/mo HYSA cadence plus $28k starting balance:\n\n- 36 months × $1,083 = $38,988\n- Compounded at 4.25% APY: ~$41,400 added\n- Total in 3 years: **~$69,400**\n\nThat's $80k short. To close the gap you'd need to add ~$2,200/mo to savings — tight on current cash flow. Realistic options: smaller down (10% = $85k), longer timeline, or higher-COL adjustment.",
      },
    ],
    title: "House down payment plan",
  },
];

export const DEMO_HOLDINGS: DemoHoldingSeed[] = [
  // ── Taxable brokerage (~$42,137) — individual companies ───────────
  // Mix of mega-cap tech + a couple smaller positions; one loss (COIN),
  // one slight loss (TSLA) so portfolio doesn't look uniformly green.
  {
    accountKey: "brokerage",
    costBasis: "4100.00",
    name: "Apple Inc.",
    price: "234.50",
    quantity: "20",
    ticker: "AAPL",
  },
  {
    accountKey: "brokerage",
    costBasis: "3800.00",
    name: "NVIDIA Corporation",
    price: "142.10",
    quantity: "30",
    ticker: "NVDA",
  },
  {
    accountKey: "brokerage",
    costBasis: "3500.00",
    name: "Microsoft Corporation",
    price: "458.20",
    quantity: "10",
    ticker: "MSFT",
  },
  {
    accountKey: "brokerage",
    costBasis: "4000.00",
    name: "Alphabet Inc. Class A",
    price: "192.40",
    quantity: "25",
    ticker: "GOOGL",
  },
  {
    accountKey: "brokerage",
    costBasis: "3800.00",
    name: "Meta Platforms Inc.",
    price: "594.20",
    quantity: "8",
    ticker: "META",
  },
  {
    accountKey: "brokerage",
    costBasis: "4200.00",
    name: "Amazon.com Inc.",
    price: "215.30",
    quantity: "22",
    ticker: "AMZN",
  },
  {
    accountKey: "brokerage",
    costBasis: "4500.00",
    name: "Tesla Inc.",
    price: "345.10",
    quantity: "12",
    ticker: "TSLA",
  },
  {
    accountKey: "brokerage",
    costBasis: "4400.00",
    name: "Taiwan Semiconductor Manufacturing Co.",
    price: "190.20",
    quantity: "30",
    ticker: "TSM",
  },
  {
    accountKey: "brokerage",
    costBasis: "2100.00",
    name: "Berkshire Hathaway Inc. Class B",
    price: "465.00",
    quantity: "5",
    ticker: "BRK.B",
  },
  {
    accountKey: "brokerage",
    costBasis: "1700.00",
    name: "JPMorgan Chase & Co.",
    price: "235.20",
    quantity: "8",
    ticker: "JPM",
  },
  {
    accountKey: "brokerage",
    costBasis: "1500.00",
    name: "Coinbase Global Inc.",
    price: "245.10",
    quantity: "5",
    ticker: "COIN",
  },

  // ── Roth IRA (~$21,581) — single names, slightly more conservative ─
  {
    accountKey: "roth_ira",
    costBasis: "5400.00",
    name: "Apple Inc.",
    price: "234.50",
    quantity: "30",
    ticker: "AAPL",
  },
  {
    accountKey: "roth_ira",
    costBasis: "2800.00",
    name: "Microsoft Corporation",
    price: "458.20",
    quantity: "8",
    ticker: "MSFT",
  },
  {
    accountKey: "roth_ira",
    costBasis: "2900.00",
    name: "Alphabet Inc. Class A",
    price: "192.40",
    quantity: "18",
    ticker: "GOOGL",
  },
  {
    accountKey: "roth_ira",
    costBasis: "3400.00",
    name: "Berkshire Hathaway Inc. Class B",
    price: "465.00",
    quantity: "8",
    ticker: "BRK.B",
  },
  {
    accountKey: "roth_ira",
    costBasis: "3500.00",
    name: "JPMorgan Chase & Co.",
    price: "235.20",
    quantity: "16",
    ticker: "JPM",
  },

  // ── Empower 401(k) (~$58,421) — self-directed brokerage window ────
  // Single names instead of target-date / index funds. Big tech weighting
  // mirrors the brokerage tilt; 401k just runs larger position sizes.
  {
    accountKey: "401k",
    costBasis: "9500.00",
    name: "Apple Inc.",
    price: "234.50",
    quantity: "50",
    ticker: "AAPL",
  },
  {
    accountKey: "401k",
    costBasis: "9000.00",
    name: "Microsoft Corporation",
    price: "458.20",
    quantity: "25",
    ticker: "MSFT",
  },
  {
    accountKey: "401k",
    costBasis: "6200.00",
    name: "Alphabet Inc. Class A",
    price: "192.40",
    quantity: "40",
    ticker: "GOOGL",
  },
  {
    accountKey: "401k",
    costBasis: "5800.00",
    name: "Meta Platforms Inc.",
    price: "594.20",
    quantity: "12",
    ticker: "META",
  },
  {
    accountKey: "401k",
    costBasis: "6500.00",
    name: "Amazon.com Inc.",
    price: "215.30",
    quantity: "35",
    ticker: "AMZN",
  },
  {
    accountKey: "401k",
    costBasis: "5500.00",
    name: "NVIDIA Corporation",
    price: "142.10",
    quantity: "50",
    ticker: "NVDA",
  },
  {
    accountKey: "401k",
    costBasis: "4800.00",
    name: "Taiwan Semiconductor Manufacturing Co.",
    price: "190.20",
    quantity: "30",
    ticker: "TSM",
  },
];

export interface DemoInvestmentActivitySeed {
  accountKey: string;
  /** Days ago. */
  daysAgo: number;
  /** Plaid-style: buy | sell | dividend | contribution | fee. */
  type: string;
  name: string;
  /** Resolved by ticker to security row at seed. Optional for cash-only activity. */
  ticker?: string;
  /** Total dollar amount (sign-matched: outflow for buy positive, dividend negative-as-credit etc — keep simple). */
  amount: string;
  quantity?: string;
  price?: string;
  fees?: string;
}

/**
 * Recent activity for the three investment accounts. Dividends roughly quarterly,
 * regular ESPP-style purchases on brokerage, payroll contributions on 401k.
 */
export const DEMO_INVESTMENT_ACTIVITY: DemoInvestmentActivitySeed[] = [
  // ── Brokerage — purchases (single names) ──────────────────────────
  {
    accountKey: "brokerage",
    amount: "1200.00",
    daysAgo: 91,
    name: "Buy NVDA",
    price: "139.80",
    quantity: "8.6",
    ticker: "NVDA",
    type: "buy",
  },
  {
    accountKey: "brokerage",
    amount: "950.00",
    daysAgo: 60,
    name: "Buy GOOGL",
    price: "189.50",
    quantity: "5",
    ticker: "GOOGL",
    type: "buy",
  },
  {
    accountKey: "brokerage",
    amount: "1500.00",
    daysAgo: 32,
    name: "Buy META",
    price: "586.40",
    quantity: "2.5",
    ticker: "META",
    type: "buy",
  },
  {
    accountKey: "brokerage",
    amount: "800.00",
    daysAgo: 14,
    name: "Buy AMZN",
    price: "212.10",
    quantity: "3.7",
    ticker: "AMZN",
    type: "buy",
  },

  // ── Brokerage — dividends ─────────────────────────────────────────
  {
    accountKey: "brokerage",
    amount: "4.80",
    daysAgo: 21,
    name: "AAPL Dividend",
    ticker: "AAPL",
    type: "dividend",
  },
  {
    accountKey: "brokerage",
    amount: "9.60",
    daysAgo: 35,
    name: "MSFT Dividend",
    ticker: "MSFT",
    type: "dividend",
  },
  {
    accountKey: "brokerage",
    amount: "8.40",
    daysAgo: 49,
    name: "JPM Dividend",
    ticker: "JPM",
    type: "dividend",
  },
  {
    accountKey: "brokerage",
    amount: "12.30",
    daysAgo: 77,
    name: "TSM Dividend",
    ticker: "TSM",
    type: "dividend",
  },

  // ── Roth IRA — contributions + dividends ──────────────────────────
  {
    accountKey: "roth_ira",
    amount: "583.33",
    daysAgo: 30,
    name: "Roth IRA Contribution",
    type: "contribution",
  },
  {
    accountKey: "roth_ira",
    amount: "583.33",
    daysAgo: 60,
    name: "Roth IRA Contribution",
    type: "contribution",
  },
  {
    accountKey: "roth_ira",
    amount: "583.33",
    daysAgo: 90,
    name: "Roth IRA Contribution",
    type: "contribution",
  },
  {
    accountKey: "roth_ira",
    amount: "7.20",
    daysAgo: 21,
    name: "AAPL Dividend",
    ticker: "AAPL",
    type: "dividend",
  },
  {
    accountKey: "roth_ira",
    amount: "16.80",
    daysAgo: 49,
    name: "JPM Dividend",
    ticker: "JPM",
    type: "dividend",
  },

  // ── 401k — payroll contributions ──────────────────────────────────
  {
    accountKey: "401k",
    amount: "650.00",
    daysAgo: 1,
    name: "Payroll Contribution",
    type: "contribution",
  },
  {
    accountKey: "401k",
    amount: "650.00",
    daysAgo: 15,
    name: "Payroll Contribution",
    type: "contribution",
  },
  {
    accountKey: "401k",
    amount: "650.00",
    daysAgo: 29,
    name: "Payroll Contribution",
    type: "contribution",
  },
  {
    accountKey: "401k",
    amount: "650.00",
    daysAgo: 43,
    name: "Payroll Contribution",
    type: "contribution",
  },
  {
    accountKey: "401k",
    amount: "650.00",
    daysAgo: 57,
    name: "Payroll Contribution",
    type: "contribution",
  },
  {
    accountKey: "401k",
    amount: "650.00",
    daysAgo: 71,
    name: "Payroll Contribution",
    type: "contribution",
  },
];
