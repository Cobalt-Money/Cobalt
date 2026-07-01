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

const CHAT_TITLES = [
  "Coffee spend this month",
  "Savings goal check-in",
  "Dining breakdown",
  "Cash position",
  "Brokerage concentration",
  "Subscription audit",
  "Credit utilization",
  "401k contribution check",
  "Tahoe trip cost",
  "Take-home pay",
  "Unusual charges scan",
  "House down payment plan",
  "Monthly budget review",
  "Rent vs income ratio",
  "Investment allocation",
  "Tax-deductible expenses",
  "Side project costs",
  "Emergency fund status",
  "Net worth trend",
  "Spending by category",
];

const USER_PROMPTS = [
  "How much did I spend on coffee this month?",
  "Am I on track to hit my savings goal?",
  "Where is most of my dining spend going?",
  "How much cash do I have across all accounts?",
  "Am I overweight tech in my brokerage?",
  "What recurring subscriptions am I paying for?",
  "How's my credit card utilization?",
  "Did my 401k contribution go through this paycheck?",
  "How much did the Tahoe trip cost?",
  "What's my real take-home after taxes and benefits?",
  "Any unusual charges in the last week?",
  "If I want to buy a house in 3 years, am I on track for a down payment?",
  "What's my average grocery spend per week?",
  "How much am I paying in interest on my student loan?",
  "Compare my spending this month to last month.",
  "Which credit card should I put restaurants on?",
  "How much did I save last quarter?",
  "Break down my transportation costs.",
  "What percentage of income goes to rent?",
  "Show me my top 10 merchants this year.",
];

const ASSISTANT_REPLIES = [
  "This is seeded demo history — static placeholder text. Send a new message to chat with the live agent.",
  "Demo data only. Ask a fresh question and the live Cobalt agent will analyze your actual seeded transactions.",
  "Placeholder reply from demo seed. Your next message routes to the real AI assistant.",
  "Seeded snapshot for UI preview. Live analysis is available when you send a new message.",
];

/** Deterministic chat fixtures for demo mode sidebar history. */
export function generateDemoChats(): DemoChatSeed[] {
  faker.seed(DEMO_SEED + 1);
  const chats: DemoChatSeed[] = [];

  for (let i = 0; i < DEMO_CHAT_THREAD_COUNT; i += 1) {
    const daysAgo = faker.number.int({ max: 180, min: 0 });
    const title = faker.helpers.arrayElement(CHAT_TITLES);
    const messages: DemoChatMessageSeed[] = [];

    for (let m = 0; m < DEMO_MESSAGES_PER_CHAT; m += 1) {
      const isUser = m % 2 === 0;
      messages.push({
        minutesAgo: (DEMO_MESSAGES_PER_CHAT - m) * 3,
        role: isUser ? "user" : "assistant",
        text: isUser
          ? faker.helpers.arrayElement(USER_PROMPTS)
          : faker.helpers.arrayElement(ASSISTANT_REPLIES),
      });
    }

    chats.push({ daysAgo, messages, title });
  }

  return chats;
}

/** ISO date string for a txn `daysAgo` offset from `now`. */
export function demoTxnDate(now: Date, daysAgo: number): string {
  return new Date(now.getTime() - daysAgo * MS_PER_DAY).toISOString().slice(0, 10);
}
