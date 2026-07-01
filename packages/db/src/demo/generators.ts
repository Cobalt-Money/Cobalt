import { faker } from "@faker-js/faker";

import {
  DEMO_CHAT_THREAD_COUNT,
  DEMO_MESSAGES_PER_CHAT,
  DEMO_SEED,
  DEMO_SNAPSHOT_HISTORY_DAYS,
  DEMO_SNAPSHOT_STEP_DAYS,
  DEMO_TXN_COUNT,
  DEMO_TXN_EXTRA_TAG_CHANCE,
  DEMO_TXN_FALLBACK_TAG_CHANCE,
  DEMO_TXN_HISTORY_DAYS,
  DEMO_TXN_MERCHANT_TAG_CHANCE,
  DEMO_TXN_NOTE_CHANCE,
} from "./config";
import { DEMO_ACCOUNTS, DEMO_MERCHANT_WEBSITES, DEMO_SNAPSHOT_TRAJECTORIES } from "./fixtures";

import type { DemoChatMessageSeed, DemoChatSeed, DemoSnapshotSeed, DemoTxnSeed } from "./fixtures";

const MS_PER_DAY = 86_400_000;

/** Sorted-by-length helper for merchant website lookup. */
const MERCHANT_PREFIXES = Object.keys(DEMO_MERCHANT_WEBSITES).toSorted(
  (a, b) => b.length - a.length,
);

export function websiteForGeneratedMerchant(merchantName: string | undefined): string | undefined {
  if (!merchantName) {
    return undefined;
  }
  const key = merchantName.toLowerCase();
  const direct = DEMO_MERCHANT_WEBSITES[key];
  if (direct) {
    return `https://${direct}`;
  }
  for (const prefix of MERCHANT_PREFIXES) {
    if (key.startsWith(prefix)) {
      return `https://${DEMO_MERCHANT_WEBSITES[prefix]}`;
    }
  }
  return undefined;
}

interface SpendProfile {
  weight: number;
  accountKey: string;
  categoryKey: string;
  merchantName: string;
  name: string;
  minAmount: number;
  maxAmount: number;
  tagKeys?: string[];
  withLocation?: boolean;
}

const SF_LAT = 37.7749;
const SF_LON = -122.4194;

const SPEND_PROFILES: SpendProfile[] = [
  {
    accountKey: "credit_sapphire",
    categoryKey: "coffee_shop",
    maxAmount: 8.5,
    merchantName: "Blue Bottle",
    minAmount: 4.5,
    name: "BLUE BOTTLE COFFEE",
    weight: 14,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "coffee_shop",
    maxAmount: 7.5,
    merchantName: "Starbucks",
    minAmount: 4.25,
    name: "STARBUCKS",
    weight: 10,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "coffee_shop",
    maxAmount: 9,
    merchantName: "Sightglass",
    minAmount: 5,
    name: "SIGHTGLASS COFFEE",
    weight: 8,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "coffee_shop",
    maxAmount: 6.5,
    merchantName: "Ritual Coffee",
    minAmount: 4,
    name: "RITUAL COFFEE",
    weight: 6,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "restaurants",
    maxAmount: 95,
    merchantName: "Tartine",
    minAmount: 18,
    name: "TARTINE BAKERY",
    weight: 9,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "restaurants",
    maxAmount: 140,
    merchantName: "Anchor Oyster Bar",
    minAmount: 45,
    name: "ANCHOR OYSTER BAR",
    weight: 7,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "restaurants",
    maxAmount: 110,
    merchantName: "Nopa",
    minAmount: 35,
    name: "NOPA",
    weight: 7,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "restaurants",
    maxAmount: 85,
    merchantName: "Souvla",
    minAmount: 14,
    name: "SOUVLA",
    weight: 8,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "restaurants",
    maxAmount: 120,
    merchantName: "State Bird Provisions",
    minAmount: 55,
    name: "STATE BIRD PROVISIONS",
    weight: 5,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "restaurants",
    maxAmount: 90,
    merchantName: "Foreign Cinema",
    minAmount: 40,
    name: "FOREIGN CINEMA",
    weight: 5,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "groceries",
    maxAmount: 165,
    merchantName: "Trader Joe's",
    minAmount: 35,
    name: "TRADER JOE'S #123",
    weight: 12,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "groceries",
    maxAmount: 210,
    merchantName: "Safeway",
    minAmount: 28,
    name: "SAFEWAY #2847",
    weight: 10,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "groceries",
    maxAmount: 180,
    merchantName: "Whole Foods",
    minAmount: 32,
    name: "WHOLE FOODS MKT",
    weight: 8,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "food_delivery",
    maxAmount: 48,
    merchantName: "DoorDash",
    minAmount: 18,
    name: "DOORDASH*ORDER",
    tagKeys: ["work"],
    weight: 11,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "food_delivery",
    maxAmount: 42,
    merchantName: "Uber Eats",
    minAmount: 16,
    name: "UBER EATS",
    tagKeys: ["work"],
    weight: 9,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "taxi",
    maxAmount: 38,
    merchantName: "Uber",
    minAmount: 9,
    name: "UBER TRIP",
    tagKeys: ["work"],
    weight: 14,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "taxi",
    maxAmount: 32,
    merchantName: "Lyft",
    minAmount: 8,
    name: "LYFT RIDE",
    tagKeys: ["work"],
    weight: 10,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "gas_fuel",
    maxAmount: 72,
    merchantName: "Chevron",
    minAmount: 38,
    name: "CHEVRON",
    tagKeys: ["tahoe"],
    weight: 6,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "gas_fuel",
    maxAmount: 68,
    merchantName: "Shell",
    minAmount: 35,
    name: "SHELL OIL",
    tagKeys: ["tahoe"],
    weight: 5,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "toll",
    maxAmount: 8.5,
    merchantName: "Fastrak",
    minAmount: 4,
    name: "FASTRAK TOLL",
    tagKeys: ["work"],
    weight: 4,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "shopping",
    maxAmount: 120,
    merchantName: "Amazon",
    minAmount: 12,
    name: "AMAZON MKTPLACE",
    tagKeys: ["subscription"],
    weight: 15,
  },
  {
    accountKey: "credit_amex",
    categoryKey: "clothing",
    maxAmount: 95,
    merchantName: "Uniqlo",
    minAmount: 22,
    name: "UNIQLO SF",
    tagKeys: ["gift"],
    weight: 5,
    withLocation: true,
  },
  {
    accountKey: "credit_amex",
    categoryKey: "clothing",
    maxAmount: 85,
    merchantName: "Everlane",
    minAmount: 28,
    name: "EVERLANE",
    tagKeys: ["gift"],
    weight: 4,
  },
  {
    accountKey: "credit_amex",
    categoryKey: "electronics",
    maxAmount: 1299,
    merchantName: "Apple",
    minAmount: 19,
    name: "APPLE.COM/BILL",
    tagKeys: ["side_project", "subscription"],
    weight: 3,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "pharmacy",
    maxAmount: 55,
    merchantName: "Walgreens",
    minAmount: 8,
    name: "WALGREENS",
    weight: 4,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "hair_beauty",
    maxAmount: 75,
    merchantName: "Peoples Barber",
    minAmount: 55,
    name: "PEOPLES BARBER SHOP",
    weight: 2,
    withLocation: true,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "hotels",
    maxAmount: 420,
    merchantName: "Airbnb",
    minAmount: 95,
    name: "AIRBNB *HM",
    tagKeys: ["tahoe"],
    weight: 2,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "other_travel",
    maxAmount: 180,
    merchantName: "Palisades Tahoe",
    minAmount: 45,
    name: "PALISADES TAHOE",
    tagKeys: ["tahoe"],
    weight: 1,
  },
  {
    accountKey: "checking",
    categoryKey: "donations",
    maxAmount: 250,
    merchantName: "Wikipedia",
    minAmount: 50,
    name: "WIKIMEDIA FOUNDATION",
    tagKeys: ["tax_deductible"],
    weight: 1,
  },
  {
    accountKey: "checking",
    categoryKey: "savings_transfer",
    maxAmount: 500,
    merchantName: "Ally Bank",
    minAmount: 500,
    name: "ONLINE TRANSFER TO ALLY",
    weight: 8,
  },
  {
    accountKey: "checking",
    categoryKey: "credit_card_payment",
    maxAmount: 2800,
    merchantName: "Chase",
    minAmount: 400,
    name: "CHASE CREDIT CRD EPAY",
    weight: 6,
  },
  {
    accountKey: "checking",
    categoryKey: "credit_card_payment",
    maxAmount: 1200,
    merchantName: "American Express",
    minAmount: 200,
    name: "AMEX EPAYMENT",
    weight: 5,
  },
  {
    accountKey: "credit_sapphire",
    categoryKey: "gift",
    maxAmount: 120,
    merchantName: "Bookshop.org",
    minAmount: 18,
    name: "BOOKSHOP.ORG",
    tagKeys: ["gift"],
    weight: 2,
  },
  {
    accountKey: "credit_amex",
    categoryKey: "shopping",
    maxAmount: 65,
    merchantName: "Goorin Bros",
    minAmount: 38,
    name: "GOORIN BROS",
    tagKeys: ["gift"],
    weight: 2,
    withLocation: true,
  },
];

const WEIGHTED_SPEND_PROFILES = SPEND_PROFILES.flatMap((profile) =>
  Array.from({ length: profile.weight }, () => profile),
);

type DemoTagKey = "gift" | "side_project" | "subscription" | "tahoe" | "tax_deductible" | "work";

const EXTRA_TAGS_BY_CATEGORY: Partial<Record<string, DemoTagKey[]>> = {
  clothing: ["gift"],
  coffee_shop: ["work"],
  electronics: ["side_project", "subscription"],
  food_delivery: ["work"],
  gas_fuel: ["tahoe", "work"],
  gift: ["gift"],
  groceries: ["tahoe"],
  hair_beauty: ["work"],
  hotels: ["tahoe"],
  other_travel: ["tahoe"],
  pharmacy: ["tax_deductible"],
  restaurants: ["gift", "work"],
  shopping: ["gift", "side_project", "subscription", "work"],
  taxi: ["tahoe", "work"],
  toll: ["work"],
};

const TAGS_BY_MERCHANT: Partial<Record<string, DemoTagKey[]>> = {
  Amazon: ["side_project", "subscription"],
  "Anchor Oyster Bar": ["work"],
  Apple: ["side_project", "subscription"],
  "Blue Bottle": ["work"],
  Chevron: ["tahoe"],
  DoorDash: ["work"],
  Everlane: ["gift"],
  Lyft: ["work"],
  "Palisades Tahoe": ["tahoe"],
  "Ritual Coffee": ["work"],
  Shell: ["tahoe"],
  Sightglass: ["work"],
  Starbucks: ["work"],
  "State Bird Provisions": ["gift", "work"],
  "Trader Joe's": ["tahoe"],
  Uber: ["work"],
  "Uber Eats": ["work"],
  Uniqlo: ["gift"],
  Wikipedia: ["tax_deductible"],
};

const FALLBACK_TAGS: DemoTagKey[] = ["gift", "side_project", "subscription", "work"];

const NOTES_BY_CATEGORY: Record<string, string[]> = {
  clothing: ["Fall layer refresh.", "Replaced worn-out basics."],
  coffee_shop: ["Quick stop before the 9am standup.", "Oat milk latte — usual order."],
  credit_card_payment: ["Pay in full before statement close.", "Autopay — cleared pending dining."],
  donations: ["Annual pledge — tax deductible.", "Year-end giving."],
  electronics: ["USB-C hub for the home desk.", "Replacement AirPods — lost one on Caltrain."],
  food_delivery: ["Late night deploy fuel.", "Too tired to cook after gym."],
  gas_fuel: ["Fill-up before the Tahoe drive.", "Commute week fill."],
  gift: ["Shipped direct — no gift wrap.", "Birthday gift for a friend."],
  groceries: ["Weekly meal prep run.", "Stocked up for a dinner party."],
  hair_beauty: ["Standing every-six-weeks cut."],
  hotels: ["Tahoe long weekend — split with friends.", "One night before an early flight."],
  other_travel: ["Lift ticket — bluebird day.", "Rental gear for the slope."],
  pharmacy: ["Allergy season restock.", "Travel-size toiletries for Tahoe."],
  restaurants: [
    "Team dinner after launch week.",
    "Split with Alex on Venmo.",
    "Client lunch — expensing to Acme.",
  ],
  savings_transfer: ["Bi-weekly HYSA auto-transfer.", "$500 to Ally — same cadence all year."],
  shopping: ["Household restock.", "Random Amazon order — check if it was the desk lamp."],
  taxi: ["Ride to SFO — work trip.", "Rainy evening — skipped BART."],
  toll: ["Bay Bridge commute day.", "Fastrak balance was running low."],
};

const NOTES_BY_MERCHANT: Record<string, string[]> = {
  "Anchor Oyster Bar": ["Always get the oysters — worth the wait.", "Celebrating a promotion."],
  "Blue Bottle": ["Morning ritual before standup.", "Weekend treat — sit-down pour-over."],
  DoorDash: ["Group order with roommates.", "Working late — expensing dinner."],
  "Palisades Tahoe": ["Bluebird day on the mountain.", "Season pass finally paying off."],
  "Peoples Barber": ["Six-week standing appointment.", "Tip included — great fade as always."],
  "State Bird Provisions": [
    "Hard reservation — worth planning around.",
    "Out-of-town friends in town.",
  ],
  "Trader Joe's": ["Meal prep Sunday haul.", "Hosted brunch — doubled the produce."],
  Uber: ["Airport run — put on Sapphire for the points.", "Late ride home from Mission."],
  Wikipedia: ["Annual recurring donation.", "End-of-year tax-deductible gift."],
};

const GENERIC_NOTES = [
  "Need to check if this was recurring.",
  "Might split this on Splitwise.",
  "Forgot about this one until the statement.",
  "Reimbursable — add to next Expensify batch.",
];

function maybeAddRandomTag(
  tagKeys: Set<DemoTagKey>,
  pool: DemoTagKey[] | undefined,
  chance: number,
): void {
  if (!pool || pool.length === 0) {
    return;
  }
  if (faker.number.float({ max: 1, min: 0 }) < chance) {
    tagKeys.add(faker.helpers.arrayElement(pool));
  }
}

function enrichSpendMetadata(profile: SpendProfile): Pick<DemoTxnSeed, "notes" | "tagKeys"> {
  const tagKeys = new Set<DemoTagKey>();
  for (const key of profile.tagKeys ?? []) {
    tagKeys.add(key as DemoTagKey);
  }

  maybeAddRandomTag(tagKeys, TAGS_BY_MERCHANT[profile.merchantName], DEMO_TXN_MERCHANT_TAG_CHANCE);
  maybeAddRandomTag(
    tagKeys,
    EXTRA_TAGS_BY_CATEGORY[profile.categoryKey],
    DEMO_TXN_EXTRA_TAG_CHANCE,
  );

  let notes: string | undefined;
  if (faker.number.float({ max: 1, min: 0 }) < DEMO_TXN_NOTE_CHANCE) {
    const merchantPool = NOTES_BY_MERCHANT[profile.merchantName];
    const pool = merchantPool ?? NOTES_BY_CATEGORY[profile.categoryKey] ?? GENERIC_NOTES;
    notes = faker.helpers.arrayElement(pool);

    // Noted txns usually get a contextual tag too.
    maybeAddRandomTag(tagKeys, TAGS_BY_MERCHANT[profile.merchantName], 0.7);
    maybeAddRandomTag(tagKeys, EXTRA_TAGS_BY_CATEGORY[profile.categoryKey], 0.7);
  }

  if (tagKeys.size === 0) {
    maybeAddRandomTag(tagKeys, FALLBACK_TAGS, DEMO_TXN_FALLBACK_TAG_CHANCE);
  }

  return {
    notes,
    tagKeys: tagKeys.size > 0 ? [...tagKeys] : undefined,
  };
}

function formatAmount(value: number): string {
  return value.toFixed(2);
}

function sfLocation(): Pick<
  DemoTxnSeed,
  "address" | "city" | "country" | "lat" | "lon" | "postalCode" | "region"
> {
  return {
    address: faker.location.streetAddress(),
    city: "San Francisco",
    country: "US",
    lat: SF_LAT + faker.number.float({ max: 0.04, min: -0.04 }),
    lon: SF_LON + faker.number.float({ max: 0.04, min: -0.04 }),
    postalCode: faker.helpers.arrayElement(["94102", "94103", "94110", "94114", "94117"]),
    region: "CA",
  };
}

function buildRandomSpend(daysAgo: number): DemoTxnSeed {
  const profile = faker.helpers.arrayElement(WEIGHTED_SPEND_PROFILES);
  const amount = faker.number.float({ max: profile.maxAmount, min: profile.minAmount });
  const rounded = Math.round(amount * 100) / 100;
  const { notes, tagKeys } = enrichSpendMetadata(profile);
  return {
    accountKey: profile.accountKey,
    amount: formatAmount(rounded),
    categoryKey: profile.categoryKey,
    daysAgo,
    merchantName: profile.merchantName,
    name: profile.name,
    notes,
    tagKeys,
    ...(profile.withLocation ? sfLocation() : {}),
  };
}

/**
 * Yields exactly {@link DEMO_TXN_COUNT} weighted-random transactions.
 * Deterministic for a given {@link DEMO_SEED}.
 * @yields {DemoTxnSeed}
 */
export function* iterateDemoTransactions(): Generator<DemoTxnSeed> {
  faker.seed(DEMO_SEED);

  for (let count = 0; count < DEMO_TXN_COUNT; count += 1) {
    const daysAgo = faker.number.int({ max: DEMO_TXN_HISTORY_DAYS, min: 0 });
    yield buildRandomSpend(daysAgo);
  }
}

/**
 * Weekly balance snapshots for every account trajectory over
 * {@link DEMO_SNAPSHOT_HISTORY_DAYS}. Linear interp + deterministic sinusoidal
 * wiggle — no randomness, every demo user sees identical charts.
 * @yields {DemoSnapshotSeed}
 */
export function* iterateDemoSnapshots(): Generator<DemoSnapshotSeed> {
  const accountByKey = new Map(DEMO_ACCOUNTS.map((account) => [account.key, account]));

  for (const traj of DEMO_SNAPSHOT_TRAJECTORIES) {
    const account = accountByKey.get(traj.accountKey);
    if (!account) {
      continue;
    }

    const endBalance = Number(account.balance);
    const span = endBalance - traj.startBalance;
    const wiggleAmp = Math.abs(span || endBalance) * traj.volatility;

    for (
      let daysAgo = DEMO_SNAPSHOT_HISTORY_DAYS;
      daysAgo >= 0;
      daysAgo -= DEMO_SNAPSHOT_STEP_DAYS
    ) {
      const t = 1 - daysAgo / DEMO_SNAPSHOT_HISTORY_DAYS;
      const base = traj.startBalance + span * t;
      const wiggle = Math.sin(t * Math.PI * 3) * wiggleAmp;
      const value = Math.max(0, base + wiggle);

      yield {
        accountKey: traj.accountKey,
        creditLimit: account.creditLimit,
        current: value.toFixed(2),
        daysAgo,
      };
    }
  }
}

/**
 * Chat topics with realistic multi-turn Q/A. Each topic drives one thread:
 * `opener` is the first user prompt, then `turns` alternate assistant/user
 * follow-ups so threads read like a coherent conversation instead of random
 * pairs. Grounded in the seeded fixture data (Chase, Amex, Vanguard, typical
 * merchants) so numbers feel plausible for the demo dataset.
 */
interface ChatTopic {
  title: string;
  opener: string;
  turns: string[];
}

// eslint-disable sort-keys — narrative order (title → opener → turns) beats alpha.
/* eslint-disable sort-keys */
const CHAT_TOPICS: ChatTopic[] = [
  {
    title: "Coffee spend this month",
    opener: "How much did I spend on coffee this month?",
    turns: [
      "You've spent $142.60 on coffee this month across 27 transactions. Blue Bottle ($68.40) and Philz ($51.20) are your top two.",
      "How does that compare to last month?",
      "Last month was $118.90, so you're up about 20%. Most of the increase came from a run of Blue Bottle mobile orders the week of the 8th.",
      "Any days I'm skipping coffee out?",
      "You had 9 no-coffee days this month, all weekdays. Weekends average $8.20/day, weekdays $4.60/day.",
      "Set me a $100/month cap on coffee going forward.",
      "Done — I've created a category budget of $100/month on \"Coffee Shops\". You'll get a nudge at 80% and again if you cross it.",
    ],
  },
  {
    title: "Savings goal check-in",
    opener: "Am I on track to hit my savings goal?",
    turns: [
      'Your "House down payment" goal is $60,000 by Dec 2027. Current balance $22,480, saving about $1,150/month. At that pace you\'d land around $58,300 — roughly $1,700 short.',
      "What would close the gap?",
      'Adding $70/month would get you there. Alternatively, redirecting the $85/month you send to "Vacation" for six months covers it without changing your take-home.',
      "Do the vacation redirect until we're back on track.",
      "Set. I'll auto-route $85/month from Vacation to Down Payment. I'll flip it back once the goal projection is on track — currently estimated April 2027.",
    ],
  },
  {
    title: "Dining breakdown",
    opener: "Where is most of my dining spend going?",
    turns: [
      "This month dining is $612 across 34 transactions. Top merchants: Sweetgreen ($148), Tartine ($92), Zuni Cafe ($78 — one dinner).",
      "How much of that is delivery vs in-person?",
      "$214 delivery (DoorDash + Caviar), $398 in-person. Delivery is up from $130 last month.",
      "Show me weekday lunch specifically.",
      "Weekday lunch is $286 — 18 transactions, average $15.90. Sweetgreen makes up 52% of that.",
    ],
  },
  {
    title: "Cash position",
    opener: "How much cash do I have across all accounts?",
    turns: [
      "Total liquid cash: $34,820. Chase Checking $6,240, Chase Savings $18,900, Amex HYSA $9,680.",
      "How much of that is earmarked?",
      '$5,000 sits under "Emergency fund", $22,480 under "Down payment", leaving $7,340 unallocated.',
      "Move the unallocated to the HYSA.",
      "Queued a transfer of $7,340 from Chase Checking to Amex HYSA. It'll settle in 2 business days at 4.35% APY — about $27/mo more interest than checking.",
    ],
  },
  {
    title: "Brokerage concentration",
    opener: "Am I overweight tech in my brokerage?",
    turns: [
      "Yes — 68% of your Vanguard brokerage is tech, mostly via VGT ($42k) and direct AAPL/MSFT/NVDA ($28k combined). Benchmark for your age group sits around 30–40%.",
      "What's the risk if I don't rebalance?",
      "Single-sector drawdowns of 25%+ are historically common in tech; on your $103k balance that's a ~$17k paper loss beyond a broad-market decline. Your fixed-income sleeve (5%) doesn't cushion much.",
      "Draft a rebalance to 40% tech.",
      "Proposed: sell $28k VGT, buy $18k VTI + $10k BND. Keeps AAPL/MSFT/NVDA intact, gets you to 41% tech, lifts bonds to 15%. Want me to send it to your Vanguard queue?",
    ],
  },
  {
    title: "Subscription audit",
    opener: "What recurring subscriptions am I paying for?",
    turns: [
      "I found 14 active subscriptions totaling $187.42/month. Biggest: Adobe CC ($54.99), NYT ($25), Spotify Family ($16.99), iCloud 2TB ($9.99).",
      "Any I haven't used lately?",
      "Two candidates: Peloton App ($12.99, no charge activity aligning with workouts in 90 days) and Calm ($14.99, similar). Combined that's $27.98/mo, $335/yr.",
      "Cancel both.",
      "I can't cancel directly, but I've queued reminders and pre-filled the cancel URLs for Peloton and Calm. I'll verify next billing cycle that the charges stop.",
    ],
  },
  {
    title: "Credit utilization",
    opener: "How's my credit card utilization?",
    turns: [
      "Aggregate utilization is 34% ($6,820 balance / $20,000 total limit). Chase Sapphire is the outlier at 61%.",
      "Does that hurt my score?",
      "Likely — most scoring models flag anything above 30% per-card. Dropping Sapphire below $3,000 before statement close (the 18th) usually moves FICO up 15–25 points.",
      "How much would I need to pay by then?",
      "$3,900 to hit 29% on that card. You have $7,340 unallocated in checking, so it's covered without touching the down payment.",
    ],
  },
  {
    title: "401k contribution check",
    opener: "Did my 401k contribution go through this paycheck?",
    turns: [
      "Yes — $1,038 pre-tax deducted on the June 28 paycheck, 12% of gross. Employer match $432 (5%) also posted.",
      "Am I on track to max this year?",
      "Not yet. You're at $12,850 YTD; max is $23,000. At the current $1,038/paycheck pace you'll finish at $20,760 — about $2,240 short.",
      "What per-paycheck rate hits the max?",
      "Bump to 13.4% starting next paycheck and you land at $23,000 in December. I can draft the payroll change email to HR if you want.",
    ],
  },
  {
    title: "Tahoe trip cost",
    opener: "How much did the Tahoe trip cost?",
    turns: [
      'Tagged "Tahoe" totals $1,847 across 22 transactions between June 14–17.',
      "Break it down.",
      "Lodging $920 (Airbnb), gas $118, groceries $164, restaurants $412, lift tickets $180, miscellaneous $53.",
      "How does that compare to the Big Bear trip in March?",
      "Big Bear was $1,214 for 3 nights — Tahoe was longer (4 nights) and dining ran ~2x higher. On a per-night basis they're within $30.",
    ],
  },
  {
    title: "Take-home pay",
    opener: "What's my real take-home after taxes and benefits?",
    turns: [
      "Average net deposit is $5,412 biweekly on $8,654 gross — a 37.5% withholding rate. Annualized net: $140,700.",
      "What's the biggest chunk taken out?",
      "Federal income tax ($1,530), FICA ($662), state ($480), 401k ($1,038), health premiums ($218). 401k is pre-tax so it lowers your federal withholding too.",
      "If I bump 401k to max, what does that change?",
      "Net drops to about $5,250/paycheck (~$162 less), but your annual federal tax bill drops by ~$2,700. Net effect: roughly $1,500/yr of extra take-home saved into retirement.",
    ],
  },
  {
    title: "Unusual charges scan",
    opener: "Any unusual charges in the last week?",
    turns: [
      'Two flags: a $148.22 charge from "SP * NORDACE" on your Sapphire (first-time merchant), and $42.10 from "UBER" at 3:14 AM on the 26th (outside your usual pattern).',
      "The Nordace one wasn't me.",
      "Marking it disputed. Chase Sapphire's dispute flow needs to start in-app — I've drafted the fraud claim text and set a reminder to file within 24 hours. Card lock available if you want to pre-empt more charges.",
      "Yes, lock it.",
      "Card lock is a Chase-side action — I can't trigger it directly, but I've deep-linked the lock action in your Chase app. Tap the notification I just sent.",
    ],
  },
  {
    title: "House down payment plan",
    opener: "If I want to buy a house in 3 years, am I on track for a down payment?",
    turns: [
      "For a $900k home at 15% down ($135k), you're at $22,480 saved with 36 months to go. That requires $3,125/month; you're currently saving $1,150/month.",
      "That's a big gap. What are my options?",
      "Three levers: (1) push out timeline to 5 years — required drops to $1,875/mo, still short by $725. (2) lower target to $800k / 10% down = $80k needed = $1,600/mo, achievable. (3) redirect $85/mo vacation + cut $200/mo dining = closes 25% of the gap on current timeline.",
      "Go with option 2 — model $800k at 10% down over 3 years.",
      "Target $80k in 36 months, $57,520 to go = $1,598/mo. You're saving $1,150/mo already, need $448 more. I can auto-route $450/mo from unallocated cash starting next paycheck.",
    ],
  },
  {
    title: "Monthly budget review",
    opener: "Walk me through this month's budget.",
    turns: [
      "Income $10,824, spending $6,940, savings/investments $2,470, leaving $1,414 unallocated. Overspent categories: Dining (+$112), Coffee (+$42). Underspent: Groceries (–$78), Transport (–$56).",
      "What drove the dining overshoot?",
      "One dinner at Zuni ($78) and 3 DoorDash orders during the week you were sick (June 12–14) totaling $94. Without those you'd have finished $60 under.",
      "That checks out. Roll the underspend forward next month?",
      "Yes — $134 groceries+transport underspend will roll into July's envelope. Combined July envelope: $2,014.",
    ],
  },
  {
    title: "Rent vs income ratio",
    opener: "What percentage of income goes to rent?",
    turns: [
      "Rent is $3,200/month against $10,824 net income = 29.6%. Below the 30% affordability rule but tight for the Bay Area given other fixed costs.",
      "What are my other fixed costs?",
      "Renters insurance $18, utilities avg $142, internet $80, phone $95, gym $65, health premium $436. Fixed total including rent: $4,036 = 37.3% of net.",
      "How does that compare to a year ago?",
      "Rent was $2,950 (27.3% of a slightly lower income). The rent bump + $50 utilities creep pushed fixed costs up ~$300/mo year over year.",
    ],
  },
  {
    title: "Investment allocation",
    opener: "What does my full portfolio allocation look like?",
    turns: [
      "Across brokerage + 401k + Roth: 72% US equities, 8% international, 5% bonds, 3% REITs, 12% cash/HYSA. Total investable: $187k.",
      "Is that appropriate for my age?",
      "For a 32-year-old with 30+ year horizon, most target-date funds sit closer to 60% US / 30% intl / 10% bonds. You're under-diversified internationally and heavy in US large-cap tech.",
      "Suggest a target allocation.",
      "60% US equities (mix VTI/VOO), 25% international (VXUS), 10% bonds (BND), 5% REITs (VNQ). Would require selling ~$22k of tech-heavy positions and redeploying — mostly in the taxable brokerage, so watch cap gains.",
    ],
  },
  {
    title: "Tax-deductible expenses",
    opener: "What deductible expenses have I logged this year?",
    turns: [
      'Tagged "deductible" this year: $2,140 charitable donations, $1,820 home office (side business), $612 professional dev (2 courses + a conference), $340 CPA fees. Total $4,912.',
      "Anything I'm probably missing?",
      "Likely: mileage for the 4 client visits I see in your calendar exports (~$210), $180 domain + hosting on the side business, health premiums if paid post-tax.",
      "Add those to the tag.",
      "Tagged. Updated total $5,302. I'll flag any transactions matching those patterns automatically for the rest of the year.",
    ],
  },
  {
    title: "Side project costs",
    opener: "How much has the side project cost me this year?",
    turns: [
      "$1,914 YTD across hosting, tools, contractor payments. Biggest: Vercel Pro ($240), Figma ($180), a $600 contractor invoice in March.",
      "How's that against revenue?",
      "Revenue YTD $4,120, cost $1,914 = $2,206 net. Margin 53.5%. That's before self-employment tax (~15.3% of net).",
      "Estimated tax bill?",
      "On $2,206 net: ~$337 SE tax + income tax at your marginal 24% = ~$530 + $337 = $867 setaside. Recommend moving that to a separate tax bucket now.",
    ],
  },
  {
    title: "Emergency fund status",
    opener: "How's my emergency fund looking?",
    turns: [
      "Emergency fund balance $5,000. Your average monthly expenses are $6,940, so that's 0.72 months of runway — well below the 3-month baseline.",
      "What would 3 months look like?",
      "$20,820 target — short by $15,820. At $300/mo dedicated contributions that's 4.4 years, which is too slow.",
      "What if I redirect from down payment temporarily?",
      "Pausing down payment for 6 months (redirect $1,150/mo) closes $6,900 of the gap. Combined with $300/mo ongoing, you'd hit 3 months' runway in about 22 months without changing lifestyle.",
    ],
  },
  {
    title: "Net worth trend",
    opener: "How has my net worth changed this year?",
    turns: [
      "Net worth Jan 1: $164,200. Today: $198,410. Up $34,210 (+20.8%). Investment gains contributed ~$18k, savings ~$16k.",
      "How much of the investment gain is unrealized?",
      "About $16,400 unrealized (mostly VGT + AAPL). Realized gains $1,600, mostly from a March rebalance.",
      "What's my biggest risk to that number?",
      "Concentration in tech (68% of taxable brokerage). A 20% sector drawdown would cost roughly $14k on paper — bigger than your annual savings pace. Rebalancing is the highest-leverage move.",
    ],
  },
  {
    title: "Spending by category",
    opener: "What are my top spending categories this month?",
    turns: [
      "1. Rent $3,200. 2. Groceries $612. 3. Dining $612. 4. Transport $284. 5. Coffee $143. 6. Entertainment $128. Rest of budget is spread across 12 smaller categories.",
      "Rent aside, where should I focus if I want to cut $300?",
      "Highest-friction targets: Dining (running 22% over historical avg), Coffee (up 20% MoM), and DoorDash specifically ($214, up from $130). Trimming those three back to trailing 3-month averages saves ~$180. Another $120 lives in Amazon incidentals worth reviewing.",
      "Set alerts on all three.",
      "Alerts set: Dining at $500/mo, Coffee at $100/mo, DoorDash at $130/mo. I'll ping you when you cross 80% of each.",
    ],
  },
  {
    title: "Grocery spend",
    opener: "What's my average grocery spend per week?",
    turns: [
      "Trailing 12 weeks: $148/week average. Range $92–$212. Trader Joe's is 58% of the total.",
      "How does that compare to national average?",
      "BLS reports single-adult grocery spend around $85–$115/week depending on region. You're on the higher end, but Bay Area cost adjusts that up ~25%, so you're roughly in line.",
      "Any weeks that stand out?",
      "Week of June 8: $212 — included a $68 Whole Foods run for the Tahoe trip. Excluding that it was $144, in-band.",
    ],
  },
];
/* eslint-enable sort-keys */

/** Deterministic chat fixtures for demo mode sidebar history. */
export function generateDemoChats(): DemoChatSeed[] {
  faker.seed(DEMO_SEED + 1);
  const chats: DemoChatSeed[] = [];

  for (let i = 0; i < DEMO_CHAT_THREAD_COUNT; i += 1) {
    const daysAgo = faker.number.int({ max: 180, min: 0 });
    const topic = CHAT_TOPICS[i % CHAT_TOPICS.length] as ChatTopic;
    const messages: DemoChatMessageSeed[] = [];

    // First message is the opener (user). Subsequent messages walk
    // `topic.turns` (assistant, user, assistant, ...). If we run out of
    // scripted turns before hitting DEMO_MESSAGES_PER_CHAT, cycle the last
    // assistant/user pair so long threads still feel on-topic.
    for (let m = 0; m < DEMO_MESSAGES_PER_CHAT; m += 1) {
      const isUser = m % 2 === 0;
      let text: string;
      if (m === 0) {
        text = topic.opener;
      } else if (m - 1 < topic.turns.length) {
        text = topic.turns[m - 1] as string;
      } else {
        // Cycle: pick from turns preserving user/assistant alignment.
        // Assistant turns are indices 0, 2, 4… in `turns`; user turns 1, 3, 5…
        const parityStart = isUser ? 1 : 0;
        const pool: string[] = [];
        for (let t = parityStart; t < topic.turns.length; t += 2) {
          pool.push(topic.turns[t] as string);
        }
        text = pool.length > 0 ? faker.helpers.arrayElement(pool) : topic.opener;
      }
      messages.push({
        minutesAgo: (DEMO_MESSAGES_PER_CHAT - m) * 3,
        role: isUser ? "user" : "assistant",
        text,
      });
    }

    chats.push({ daysAgo, messages, title: topic.title });
  }

  return chats;
}

/** ISO date string for a txn `daysAgo` offset from `now`. */
export function demoTxnDate(now: Date, daysAgo: number): string {
  return new Date(now.getTime() - daysAgo * MS_PER_DAY).toISOString().slice(0, 10);
}
