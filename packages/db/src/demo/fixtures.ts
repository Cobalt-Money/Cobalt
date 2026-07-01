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
  /** Balance at the start of {@link DEMO_SNAPSHOT_HISTORY_DAYS}. End = account `balance`. */
  startBalance: number;
  /** Wiggle amplitude as a fraction of the trajectory's span (0–1).
   * Higher = more volatile-looking chart. Volatile-asset accounts ~0.04;
   * cash/loans ~0.005. */
  volatility: number;
}

export interface DemoSnapshotSeed {
  accountKey: string;
  /** Days before seed `now`. */
  daysAgo: number;
  current: string;
  creditLimit?: string;
}

/**
 * Per-account ~10y trajectories. Drives weekly snapshot generation in the
 * seed function. End balance is taken from `DEMO_ACCOUNTS[i].balance` — we
 * only declare the starting point + how bumpy the line looks getting there.
 *
 * Story:
 *   • checking — modest drift up, payday sawtooth
 *   • savings — steady climb (transfers + interest)
 *   • credit_sapphire / credit_amex — oscillate (charged then paid)
 *   • brokerage — strong climb with market noise
 *   • roth_ira / 401k — steady climb
 *   • student_loan — linear decline (~$435/mo paid down)
 */
export const DEMO_SNAPSHOT_TRAJECTORIES: DemoSnapshotTrajectory[] = [
  { accountKey: "checking", startBalance: 1200, volatility: 0.08 },
  { accountKey: "savings", startBalance: 2500, volatility: 0.005 },
  { accountKey: "credit_sapphire", startBalance: 650, volatility: 0.45 },
  { accountKey: "credit_amex", startBalance: 380, volatility: 0.35 },
  { accountKey: "brokerage", startBalance: 9500, volatility: 0.04 },
  { accountKey: "roth_ira", startBalance: 5200, volatility: 0.03 },
  { accountKey: "401k", startBalance: 14_000, volatility: 0.025 },
  { accountKey: "student_loan", startBalance: 38_500, volatility: 0.001 },
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
