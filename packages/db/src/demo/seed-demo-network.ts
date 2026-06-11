import { inArray, sql } from "drizzle-orm";

import { db } from "../index";
import { financialAccount } from "../schema/accounts/account";
import { category } from "../schema/accounts/banking/categories/category";
import { transaction } from "../schema/accounts/banking/transactions/transaction";
import { socialFriendship } from "../schema/social/friendship";
import { socialPost } from "../schema/social/post";
import { user } from "../schema/users/auth/auth";

/**
 * Shared, read-only demo network surfaced to unauthenticated callers of the
 * friends app for landing-page SEO + product preview. NOT a per-visitor demo
 * (that's `seedDemoUser`). All six rows below have stable string ids so the
 * `packages/zero/src/social/queries.ts` anon fallback can hardcode them.
 *
 * Idempotent: run-by-run delete-then-insert keyed on the user ids. Safe to
 * re-run any time the curated content changes. If you rename an id here,
 * also update `packages/zero/src/social/constants.ts`.
 */

const DEMO_ROOT_ID = "demo-pocketwatch-root";
const DEMO_FRIEND_IDS = [
  "demo-friend-ava",
  "demo-friend-ben",
  "demo-friend-cleo",
  "demo-friend-dax",
  "demo-friend-eli",
] as const;
const DEMO_NETWORK_IDS = [DEMO_ROOT_ID, ...DEMO_FRIEND_IDS] as const;

interface DemoNetworkUser {
  id: string;
  name: string;
  username: string;
  displayUsername: string;
  email: string;
  image: string;
  cardName: string;
  cardMask: string;
  institutionName: string;
}

const DEMO_USERS: DemoNetworkUser[] = [
  {
    cardMask: "4421",
    cardName: "Chase Sapphire Reserve",
    displayUsername: "johndoe",
    email: "demo@demo.cobalt.internal",
    id: DEMO_ROOT_ID,
    image: "https://api.dicebear.com/9.x/toon-head/svg?seed=johndoe",
    institutionName: "Chase",
    name: "John Doe",
    username: "johndoe",
  },
  {
    cardMask: "1003",
    cardName: "American Express Gold",
    displayUsername: "ava",
    email: "ava@demo.cobalt.internal",
    id: "demo-friend-ava",
    image: "https://api.dicebear.com/9.x/toon-head/svg?seed=ava",
    institutionName: "American Express",
    name: "Ava Chen",
    username: "ava",
  },
  {
    cardMask: "7788",
    cardName: "Capital One Venture X",
    displayUsername: "ben",
    email: "ben@demo.cobalt.internal",
    id: "demo-friend-ben",
    image: "https://api.dicebear.com/9.x/toon-head/svg?seed=ben",
    institutionName: "Capital One",
    name: "Ben Park",
    username: "ben",
  },
  {
    cardMask: "2210",
    cardName: "Apple Card",
    displayUsername: "cleo",
    email: "cleo@demo.cobalt.internal",
    id: "demo-friend-cleo",
    image: "https://api.dicebear.com/9.x/toon-head/svg?seed=cleo",
    institutionName: "Goldman Sachs",
    name: "Cleo Reyes",
    username: "cleo",
  },
  {
    cardMask: "5566",
    cardName: "Chase Freedom Unlimited",
    displayUsername: "dax",
    email: "dax@demo.cobalt.internal",
    id: "demo-friend-dax",
    image: "https://api.dicebear.com/9.x/toon-head/svg?seed=dax",
    institutionName: "Chase",
    name: "Dax Miller",
    username: "dax",
  },
  {
    cardMask: "9988",
    cardName: "Citi Double Cash",
    displayUsername: "eli",
    email: "eli@demo.cobalt.internal",
    id: "demo-friend-eli",
    image: "https://api.dicebear.com/9.x/toon-head/svg?seed=eli",
    institutionName: "Citi",
    name: "Eli Tanaka",
    username: "eli",
  },
];

/** Plaid Personal Finance Category pair keyed by our system_key. */
const PFC_BY_KEY: Record<string, { primary: string; detailed: string }> = {
  alcohol_bars: { detailed: "FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR", primary: "FOOD_AND_DRINK" },
  clothing: {
    detailed: "GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES",
    primary: "GENERAL_MERCHANDISE",
  },
  coffee_shop: { detailed: "FOOD_AND_DRINK_COFFEE", primary: "FOOD_AND_DRINK" },
  electronics: { detailed: "GENERAL_MERCHANDISE_ELECTRONICS", primary: "GENERAL_MERCHANDISE" },
  event: { detailed: "ENTERTAINMENT_TV_AND_MOVIES", primary: "ENTERTAINMENT" },
  fitness: { detailed: "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS", primary: "PERSONAL_CARE" },
  food_delivery: { detailed: "FOOD_AND_DRINK_FAST_FOOD", primary: "FOOD_AND_DRINK" },
  groceries: { detailed: "FOOD_AND_DRINK_GROCERIES", primary: "FOOD_AND_DRINK" },
  movies: { detailed: "ENTERTAINMENT_TV_AND_MOVIES", primary: "ENTERTAINMENT" },
  music: { detailed: "ENTERTAINMENT_MUSIC_AND_AUDIO", primary: "ENTERTAINMENT" },
  restaurants: { detailed: "FOOD_AND_DRINK_RESTAURANT", primary: "FOOD_AND_DRINK" },
  shopping: {
    detailed: "GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE",
    primary: "GENERAL_MERCHANDISE",
  },
  snacks: { detailed: "FOOD_AND_DRINK_FAST_FOOD", primary: "FOOD_AND_DRINK" },
  taxi: { detailed: "TRANSPORTATION_TAXIS_AND_RIDE_SHARES", primary: "TRANSPORTATION" },
};

interface DemoPostSeed {
  userId: string;
  merchantName: string;
  website: string;
  /** Domain root for logo lookup via clearbit (e.g. "lilianewyork.com"). */
  logoDomain: string;
  lat: number;
  lon: number;
  amountCents: number;
  daysAgo: number;
  /** Maps to `system_key` of the category row seeded for the user. */
  categorySystemKey: keyof typeof PFC_BY_KEY;
  note?: string;
}

// Real NYC spots — verified coords + websites. Spread across Manhattan,
// Williamsburg, Bushwick, LES, Greenpoint for visual density at city zoom.
const DEMO_POSTS: DemoPostSeed[] = [
  // John Doe (root) — 5 posts
  {
    amountCents: 625,
    categorySystemKey: "coffee_shop",
    daysAgo: 1,
    lat: 40.7259,
    logoDomain: "abraconyc.com",
    lon: -73.9776,
    merchantName: "Abraço",
    note: "best cortado on east 7th",
    userId: DEMO_ROOT_ID,
    website: "https://abraconyc.com",
  },
  {
    amountCents: 4250,
    categorySystemKey: "restaurants",
    daysAgo: 3,
    lat: 40.7197,
    logoDomain: "scarrspizza.com",
    lon: -73.9876,
    merchantName: "Scarr's Pizza",
    note: "slice + a beer fix",
    userId: DEMO_ROOT_ID,
    website: "https://scarrspizza.com",
  },
  {
    amountCents: 1850,
    categorySystemKey: "alcohol_bars",
    daysAgo: 4,
    lat: 40.7274,
    logoDomain: "attaboybar.com",
    lon: -73.9886,
    merchantName: "Attaboy",
    note: "negroni nightcap",
    userId: DEMO_ROOT_ID,
    website: "https://attaboybar.com",
  },
  {
    amountCents: 7200,
    categorySystemKey: "groceries",
    daysAgo: 5,
    lat: 40.7308,
    logoDomain: "wholefoodsmarket.com",
    lon: -73.9913,
    merchantName: "Whole Foods Market",
    userId: DEMO_ROOT_ID,
    website: "https://wholefoodsmarket.com",
  },
  {
    amountCents: 2150,
    categorySystemKey: "taxi",
    daysAgo: 2,
    lat: 40.7234,
    logoDomain: "uber.com",
    lon: -73.9876,
    merchantName: "Uber",
    note: "rain dash from Mission Chinese",
    userId: DEMO_ROOT_ID,
    website: "https://uber.com",
  },
  // Ava — 5 posts
  {
    amountCents: 575,
    categorySystemKey: "coffee_shop",
    daysAgo: 1,
    lat: 40.7193,
    logoDomain: "devocion.com",
    lon: -73.9577,
    merchantName: "Devoción",
    userId: "demo-friend-ava",
    website: "https://devocion.com",
  },
  {
    amountCents: 13_800,
    categorySystemKey: "restaurants",
    daysAgo: 5,
    lat: 40.7165,
    logoDomain: "lilianewyork.com",
    lon: -73.9477,
    merchantName: "Lilia",
    note: "anniversary — booked 6 weeks out",
    userId: "demo-friend-ava",
    website: "https://lilianewyork.com",
  },
  {
    amountCents: 4400,
    categorySystemKey: "alcohol_bars",
    daysAgo: 3,
    lat: 40.7137,
    logoDomain: "donnabklyn.com",
    lon: -73.9576,
    merchantName: "Donna",
    note: "rosemary gimlet on the patio",
    userId: "demo-friend-ava",
    website: "https://donnabklyn.com",
  },
  {
    amountCents: 11_200,
    categorySystemKey: "clothing",
    daysAgo: 8,
    lat: 40.7223,
    logoDomain: "shop-toughs.com",
    lon: -73.9576,
    merchantName: "Toughs",
    note: "spring jacket finally",
    userId: "demo-friend-ava",
    website: "https://shop-toughs.com",
  },
  {
    amountCents: 2850,
    categorySystemKey: "fitness",
    daysAgo: 2,
    lat: 40.7142,
    logoDomain: "barrys.com",
    lon: -73.961,
    merchantName: "Barry's Bootcamp",
    userId: "demo-friend-ava",
    website: "https://barrys.com",
  },
  // Ben — 5 posts
  {
    amountCents: 475,
    categorySystemKey: "restaurants",
    daysAgo: 2,
    lat: 40.7307,
    logoDomain: "joespizzanyc.com",
    lon: -74.0024,
    merchantName: "Joe's Pizza",
    note: "post-bar slice run",
    userId: "demo-friend-ben",
    website: "https://joespizzanyc.com",
  },
  {
    amountCents: 9200,
    categorySystemKey: "restaurants",
    daysAgo: 6,
    lat: 40.7223,
    logoDomain: "russanddaughterscafe.com",
    lon: -73.9882,
    merchantName: "Russ & Daughters Cafe",
    note: "saturday brunch w/ mom",
    userId: "demo-friend-ben",
    website: "https://russanddaughterscafe.com",
  },
  {
    amountCents: 685,
    categorySystemKey: "coffee_shop",
    daysAgo: 1,
    lat: 40.729,
    logoDomain: "ninthstreetespresso.com",
    lon: -73.9836,
    merchantName: "Ninth Street Espresso",
    userId: "demo-friend-ben",
    website: "https://ninthstreetespresso.com",
  },
  {
    amountCents: 5400,
    categorySystemKey: "event",
    daysAgo: 10,
    lat: 40.7295,
    logoDomain: "bowerypresents.com",
    lon: -73.993,
    merchantName: "Bowery Ballroom",
    note: "MJ Lenderman, opener was sick",
    userId: "demo-friend-ben",
    website: "https://bowerypresents.com",
  },
  {
    amountCents: 18_500,
    categorySystemKey: "restaurants",
    daysAgo: 0,
    lat: 40.7335,
    logoDomain: "donangie.com",
    lon: -74.005,
    merchantName: "Don Angie",
    note: "lasagna pinwheel x2 — life changing",
    userId: "demo-friend-ben",
    website: "https://donangie.com",
  },
  // Cleo — 5 posts
  {
    amountCents: 550,
    categorySystemKey: "coffee_shop",
    daysAgo: 2,
    lat: 40.7177,
    logoDomain: "varietycoffeeroasters.com",
    lon: -73.9591,
    merchantName: "Variety Coffee",
    userId: "demo-friend-cleo",
    website: "https://varietycoffeeroasters.com",
  },
  {
    amountCents: 6800,
    categorySystemKey: "restaurants",
    daysAgo: 5,
    lat: 40.7053,
    logoDomain: "robertaspizza.com",
    lon: -73.9335,
    merchantName: "Roberta's",
    note: "bee sting + natural wine",
    userId: "demo-friend-cleo",
    website: "https://robertaspizza.com",
  },
  {
    amountCents: 21_500,
    categorySystemKey: "restaurants",
    daysAgo: 3,
    lat: 40.732,
    logoDomain: "4charlesprimerib.com",
    lon: -74.0061,
    merchantName: "4 Charles Prime Rib",
    note: "prime rib + martini, worth the wait",
    userId: "demo-friend-cleo",
    website: "https://4charlesprimerib.com",
  },
  {
    amountCents: 1875,
    categorySystemKey: "movies",
    daysAgo: 6,
    lat: 40.7095,
    logoDomain: "nitehawkcinema.com",
    lon: -73.9398,
    merchantName: "Nitehawk Prospect Park",
    note: "Past Lives 35mm",
    userId: "demo-friend-cleo",
    website: "https://nitehawkcinema.com",
  },
  {
    amountCents: 9400,
    categorySystemKey: "groceries",
    daysAgo: 4,
    lat: 40.7048,
    logoDomain: "traderjoes.com",
    lon: -73.9357,
    merchantName: "Trader Joe's",
    userId: "demo-friend-cleo",
    website: "https://traderjoes.com",
  },
  // Dax — 5 posts
  {
    amountCents: 1850,
    categorySystemKey: "snacks",
    daysAgo: 1,
    lat: 40.7239,
    logoDomain: "peterpandonuts.com",
    lon: -73.9529,
    merchantName: "Peter Pan Donut & Pastry Shop",
    note: "honey-dip x2, no regrets",
    userId: "demo-friend-dax",
    website: "https://peterpandonuts.com",
  },
  {
    amountCents: 7600,
    categorySystemKey: "restaurants",
    daysAgo: 4,
    lat: 40.7254,
    logoDomain: "raouls.com",
    lon: -74.003,
    merchantName: "Raoul's",
    userId: "demo-friend-dax",
    website: "https://raouls.com",
  },
  {
    amountCents: 24_800,
    categorySystemKey: "restaurants",
    daysAgo: 2,
    lat: 40.7283,
    logoDomain: "carbonenewyork.com",
    lon: -74.0027,
    merchantName: "Carbone",
    note: "spicy rigatoni vodka, classic",
    userId: "demo-friend-dax",
    website: "https://carbonenewyork.com",
  },
  {
    amountCents: 3850,
    categorySystemKey: "shopping",
    daysAgo: 7,
    lat: 40.7271,
    logoDomain: "mcnallyjacksonbooks.com",
    lon: -73.9956,
    merchantName: "McNally Jackson Books",
    note: "two paperbacks + magazine",
    userId: "demo-friend-dax",
    website: "https://mcnallyjacksonbooks.com",
  },
  {
    amountCents: 2240,
    categorySystemKey: "taxi",
    daysAgo: 3,
    lat: 40.726,
    logoDomain: "lyft.com",
    lon: -73.993,
    merchantName: "Lyft",
    userId: "demo-friend-dax",
    website: "https://lyft.com",
  },
  // Eli — 5 posts
  {
    amountCents: 525,
    categorySystemKey: "coffee_shop",
    daysAgo: 1,
    lat: 40.7212,
    logoDomain: "partnerscoffee.com",
    lon: -73.9582,
    merchantName: "Partners Coffee",
    userId: "demo-friend-eli",
    website: "https://partnerscoffee.com",
  },
  {
    amountCents: 10_400,
    categorySystemKey: "restaurants",
    daysAgo: 6,
    lat: 40.7178,
    logoDomain: "misinewyork.com",
    lon: -73.9573,
    merchantName: "Misi",
    note: "pasta tasting, worth it",
    userId: "demo-friend-eli",
    website: "https://misinewyork.com",
  },
  {
    amountCents: 1850,
    categorySystemKey: "alcohol_bars",
    daysAgo: 3,
    lat: 40.7138,
    logoDomain: "fortdefiancenyc.com",
    lon: -73.9548,
    merchantName: "Fort Defiance",
    note: "rye sour, classic",
    userId: "demo-friend-eli",
    website: "https://fortdefiancenyc.com",
  },
  {
    amountCents: 4250,
    categorySystemKey: "fitness",
    daysAgo: 5,
    lat: 40.7224,
    logoDomain: "equinox.com",
    lon: -73.9576,
    merchantName: "Equinox",
    userId: "demo-friend-eli",
    website: "https://equinox.com",
  },
  {
    amountCents: 2950,
    categorySystemKey: "electronics",
    daysAgo: 9,
    lat: 40.7245,
    logoDomain: "bhphotovideo.com",
    lon: -73.9931,
    merchantName: "B&H Photo",
    note: "SD cards + new strap",
    userId: "demo-friend-eli",
    website: "https://bhphotovideo.com",
  },
  // === SAN FRANCISCO === 30 posts (5 per user). Spread Mission, SOMA, Hayes
  // Valley, North Beach, Castro, Outer Sunset.
  // John Doe (root) — SF
  {
    amountCents: 575,
    categorySystemKey: "coffee_shop",
    daysAgo: 1,
    lat: 37.7762,
    logoDomain: "bluebottlecoffee.com",
    lon: -122.4233,
    merchantName: "Blue Bottle Coffee",
    note: "Mint Plaza office stop",
    userId: DEMO_ROOT_ID,
    website: "https://bluebottlecoffee.com",
  },
  {
    amountCents: 1840,
    categorySystemKey: "restaurants",
    daysAgo: 3,
    lat: 37.7614,
    logoDomain: "tartinebakery.com",
    lon: -122.4241,
    merchantName: "Tartine Bakery",
    userId: DEMO_ROOT_ID,
    website: "https://tartinebakery.com",
  },
  {
    amountCents: 6800,
    categorySystemKey: "groceries",
    daysAgo: 5,
    lat: 37.7607,
    logoDomain: "biritemarket.com",
    lon: -122.4216,
    merchantName: "Bi-Rite Market",
    note: "weeknight stuff",
    userId: DEMO_ROOT_ID,
    website: "https://biritemarket.com",
  },
  {
    amountCents: 1750,
    categorySystemKey: "alcohol_bars",
    daysAgo: 2,
    lat: 37.7589,
    logoDomain: "trickdogbar.com",
    lon: -122.4117,
    merchantName: "Trick Dog",
    note: "menu changeover night",
    userId: DEMO_ROOT_ID,
    website: "https://trickdogbar.com",
  },
  {
    amountCents: 2680,
    categorySystemKey: "taxi",
    daysAgo: 4,
    lat: 37.7749,
    logoDomain: "lyft.com",
    lon: -122.4194,
    merchantName: "Lyft",
    userId: DEMO_ROOT_ID,
    website: "https://lyft.com",
  },
  // Ava — SF
  {
    amountCents: 650,
    categorySystemKey: "coffee_shop",
    daysAgo: 1,
    lat: 37.7766,
    logoDomain: "sightglasscoffee.com",
    lon: -122.4106,
    merchantName: "Sightglass Coffee",
    userId: "demo-friend-ava",
    website: "https://sightglasscoffee.com",
  },
  {
    amountCents: 8450,
    categorySystemKey: "restaurants",
    daysAgo: 5,
    lat: 37.7563,
    logoDomain: "foreigncinema.com",
    lon: -122.4187,
    merchantName: "Foreign Cinema",
    note: "dinner w/ team",
    userId: "demo-friend-ava",
    website: "https://foreigncinema.com",
  },
  {
    amountCents: 2100,
    categorySystemKey: "alcohol_bars",
    daysAgo: 3,
    lat: 37.7634,
    logoDomain: "abvsf.com",
    lon: -122.4202,
    merchantName: "ABV",
    userId: "demo-friend-ava",
    website: "https://abvsf.com",
  },
  {
    amountCents: 14_200,
    categorySystemKey: "clothing",
    daysAgo: 7,
    lat: 37.7758,
    logoDomain: "aplaceapart.com",
    lon: -122.4256,
    merchantName: "A Place Apart",
    note: "denim splurge",
    userId: "demo-friend-ava",
    website: "https://aplaceapart.com",
  },
  {
    amountCents: 3250,
    categorySystemKey: "fitness",
    daysAgo: 2,
    lat: 37.7869,
    logoDomain: "barrys.com",
    lon: -122.403,
    merchantName: "Barry's SF",
    userId: "demo-friend-ava",
    website: "https://barrys.com",
  },
  // Ben — SF
  {
    amountCents: 525,
    categorySystemKey: "coffee_shop",
    daysAgo: 2,
    lat: 37.7639,
    logoDomain: "philzcoffee.com",
    lon: -122.4218,
    merchantName: "Philz Coffee",
    userId: "demo-friend-ben",
    website: "https://philzcoffee.com",
  },
  {
    amountCents: 9200,
    categorySystemKey: "restaurants",
    daysAgo: 6,
    lat: 37.7749,
    logoDomain: "nopasf.com",
    lon: -122.4376,
    merchantName: "Nopa",
    note: "burger + crispy chickpeas",
    userId: "demo-friend-ben",
    website: "https://nopasf.com",
  },
  {
    amountCents: 1950,
    categorySystemKey: "alcohol_bars",
    daysAgo: 1,
    lat: 37.7641,
    logoDomain: "alembicbar.com",
    lon: -122.4318,
    merchantName: "The Alembic",
    userId: "demo-friend-ben",
    website: "https://alembicbar.com",
  },
  {
    amountCents: 6400,
    categorySystemKey: "event",
    daysAgo: 8,
    lat: 37.7726,
    logoDomain: "thefillmore.com",
    lon: -122.4332,
    merchantName: "The Fillmore",
    note: "Khruangbin",
    userId: "demo-friend-ben",
    website: "https://thefillmore.com",
  },
  {
    amountCents: 32_400,
    categorySystemKey: "restaurants",
    daysAgo: 0,
    lat: 37.7969,
    logoDomain: "quincerestaurant.com",
    lon: -122.4039,
    merchantName: "Quince",
    note: "tasting menu w/ wine pairing",
    userId: "demo-friend-ben",
    website: "https://quincerestaurant.com",
  },
  // Cleo — SF
  {
    amountCents: 545,
    categorySystemKey: "coffee_shop",
    daysAgo: 2,
    lat: 37.774,
    logoDomain: "ritualcoffee.com",
    lon: -122.4194,
    merchantName: "Ritual Coffee",
    userId: "demo-friend-cleo",
    website: "https://ritualcoffee.com",
  },
  {
    amountCents: 28_600,
    categorySystemKey: "restaurants",
    daysAgo: 5,
    lat: 37.78,
    logoDomain: "saisonsf.com",
    lon: -122.3917,
    merchantName: "Saison",
    note: "tasting menu — once a year thing",
    userId: "demo-friend-cleo",
    website: "https://saisonsf.com",
  },
  {
    amountCents: 2400,
    categorySystemKey: "alcohol_bars",
    daysAgo: 3,
    lat: 37.7641,
    logoDomain: "midnightsf.com",
    lon: -122.4283,
    merchantName: "Last Rites",
    note: "tiki!",
    userId: "demo-friend-cleo",
    website: "https://lastritessf.com",
  },
  {
    amountCents: 8800,
    categorySystemKey: "groceries",
    daysAgo: 6,
    lat: 37.7758,
    logoDomain: "rainbow.coop",
    lon: -122.4222,
    merchantName: "Rainbow Grocery",
    userId: "demo-friend-cleo",
    website: "https://rainbow.coop",
  },
  {
    amountCents: 1620,
    categorySystemKey: "movies",
    daysAgo: 4,
    lat: 37.7611,
    logoDomain: "rouletheater.com",
    lon: -122.4225,
    merchantName: "Roxie Theater",
    note: "Wong Kar-wai retro",
    userId: "demo-friend-cleo",
    website: "https://roxie.com",
  },
  // Dax — SF
  {
    amountCents: 1320,
    categorySystemKey: "snacks",
    daysAgo: 1,
    lat: 37.7592,
    logoDomain: "bobsdonuts.com",
    lon: -122.4219,
    merchantName: "Bob's Donuts",
    note: "apple fritter run",
    userId: "demo-friend-dax",
    website: "https://bobsdonutssf.com",
  },
  {
    amountCents: 8200,
    categorySystemKey: "restaurants",
    daysAgo: 4,
    lat: 37.7796,
    logoDomain: "zunicafe.com",
    lon: -122.4232,
    merchantName: "Zuni Cafe",
    note: "chicken for two",
    userId: "demo-friend-dax",
    website: "https://zunicafe.com",
  },
  {
    amountCents: 1850,
    categorySystemKey: "alcohol_bars",
    daysAgo: 2,
    lat: 37.7755,
    logoDomain: "smugglerscovesf.com",
    lon: -122.4221,
    merchantName: "Smuggler's Cove",
    note: "navy grog",
    userId: "demo-friend-dax",
    website: "https://smugglerscovesf.com",
  },
  {
    amountCents: 4250,
    categorySystemKey: "shopping",
    daysAgo: 7,
    lat: 37.7644,
    logoDomain: "dogeared.com",
    lon: -122.4232,
    merchantName: "Dog Eared Books",
    userId: "demo-friend-dax",
    website: "https://dogearedbooks.com",
  },
  {
    amountCents: 2360,
    categorySystemKey: "taxi",
    daysAgo: 3,
    lat: 37.7833,
    logoDomain: "uber.com",
    lon: -122.4167,
    merchantName: "Uber",
    userId: "demo-friend-dax",
    website: "https://uber.com",
  },
  // Eli — SF
  {
    amountCents: 595,
    categorySystemKey: "coffee_shop",
    daysAgo: 1,
    lat: 37.7607,
    logoDomain: "fourbarrelcoffee.com",
    lon: -122.4214,
    merchantName: "Four Barrel Coffee",
    userId: "demo-friend-eli",
    website: "https://fourbarrelcoffee.com",
  },
  {
    amountCents: 11_400,
    categorySystemKey: "restaurants",
    daysAgo: 6,
    lat: 37.777,
    logoDomain: "stateofbird.com",
    lon: -122.4296,
    merchantName: "State Bird Provisions",
    note: "dim-sum cart spree",
    userId: "demo-friend-eli",
    website: "https://statebirdsf.com",
  },
  {
    amountCents: 1950,
    categorySystemKey: "alcohol_bars",
    daysAgo: 3,
    lat: 37.7657,
    logoDomain: "phonebooth-sf.com",
    lon: -122.4215,
    merchantName: "Phone Booth",
    note: "dive vibes",
    userId: "demo-friend-eli",
    website: "https://phoneboothbarsf.com",
  },
  {
    amountCents: 4850,
    categorySystemKey: "fitness",
    daysAgo: 4,
    lat: 37.7805,
    logoDomain: "equinox.com",
    lon: -122.4084,
    merchantName: "Equinox SOMA",
    userId: "demo-friend-eli",
    website: "https://equinox.com",
  },
  {
    amountCents: 3680,
    categorySystemKey: "electronics",
    daysAgo: 9,
    lat: 37.7785,
    logoDomain: "centralcomputer.com",
    lon: -122.4123,
    merchantName: "Central Computer",
    note: "thunderbolt dock",
    userId: "demo-friend-eli",
    website: "https://centralcomputer.com",
  },
];

const MS_PER_DAY = 86_400_000;

/** Sort string ids so they satisfy `social_friendship_sorted_chk`. */
function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function seedDemoNetwork(): Promise<void> {
  const ids = [...DEMO_NETWORK_IDS];

  // Wrap delete + insert in a single transaction so a mid-seed failure
  // can't leave partial demo state (e.g. users wiped but posts unrestored).
  await db.transaction(async (tx) => {
    // Order matters only for `user`: cascade FKs on transaction, account,
    // friendship, post wipe everything else when we delete the users. Doing it
    // explicit anyway so partial seeds (e.g. user row missing) still clean.
    await tx.delete(socialPost).where(inArray(socialPost.userId, ids));
    await tx.delete(socialFriendship).where(inArray(socialFriendship.userAId, ids));
    await tx.delete(socialFriendship).where(inArray(socialFriendship.userBId, ids));
    await tx.delete(transaction).where(inArray(transaction.userId, ids));
    await tx.delete(financialAccount).where(inArray(financialAccount.userId, ids));
    await tx.delete(user).where(inArray(user.id, ids));

    // 1. Users
    await tx.insert(user).values(
      DEMO_USERS.map((u) => ({
        displayUsername: u.displayUsername,
        email: u.email,
        emailVerified: true,
        id: u.id,
        image: u.image,
        isAnonymous: false,
        name: u.name,
        username: u.username,
      })),
    );

    // 2. Seed system categories per user (mirrors `seedUserCategories` from the
    // auth package — duplicated here to avoid pulling @cobalt-web/auth into @cobalt-web/db).
    for (const u of DEMO_USERS) {
      await seedSystemCategoriesForUser(tx, u.id);
    }

    // Build categoryId lookup keyed by (userId, systemKey).
    const categoryRows = await tx
      .select({ id: category.id, systemKey: category.systemKey, userId: category.userId })
      .from(category)
      .where(inArray(category.userId, ids));
    const categoryIdByUserKey = new Map<string, string>();
    for (const row of categoryRows) {
      if (row.systemKey) {
        categoryIdByUserKey.set(`${row.userId}:${row.systemKey}`, row.id);
      }
    }

    // 3. One manual credit card per user — labeled with real card name + mask.
    const accountByUser = new Map<
      string,
      { id: string; name: string; institutionName: string; mask: string }
    >();
    for (const u of DEMO_USERS) {
      const [acct] = await tx
        .insert(financialAccount)
        .values({
          institutionName: u.institutionName,
          mask: u.cardMask,
          name: u.cardName,
          source: "manual",
          type: "credit",
          userId: u.id,
        })
        .returning({ id: financialAccount.id });
      if (!acct) {
        throw new Error(`seed-demo-network: failed to insert account for ${u.id}`);
      }
      accountByUser.set(u.id, {
        id: acct.id,
        institutionName: u.institutionName,
        mask: u.cardMask,
        name: u.cardName,
      });
    }

    // 4. Transactions — one per post (post.transactionId required + unique on
    // (userId, transactionId)). Categories resolved via system_key lookup.
    const now = Date.now();
    const txnIdByPostIdx: string[] = [];
    for (const post of DEMO_POSTS) {
      const acct = accountByUser.get(post.userId);
      if (!acct) {
        throw new Error(`seed-demo-network: missing account for ${post.userId}`);
      }
      const categoryId = categoryIdByUserKey.get(`${post.userId}:${post.categorySystemKey}`);
      const pfc = PFC_BY_KEY[post.categorySystemKey];
      const isoDate = new Date(now - post.daysAgo * MS_PER_DAY).toISOString().slice(0, 10);
      const [txn] = await tx
        .insert(transaction)
        .values({
          accountId: acct.id,
          amount: (post.amountCents / 100).toFixed(4),
          categoryId,
          date: isoDate,
          excluded: false,
          lat: post.lat,
          logoUrl: `https://www.google.com/s2/favicons?domain=${post.logoDomain}&sz=128`,
          lon: post.lon,
          merchantName: post.merchantName,
          name: post.merchantName,
          paymentChannel: "in store",
          pending: false,
          pfcDetailed: pfc?.detailed,
          pfcPrimary: pfc?.primary,
          source: "plaid",
          userId: post.userId,
          website: post.website,
        })
        .returning({ id: transaction.id });
      if (!txn) {
        throw new Error(`seed-demo-network: failed to insert txn for ${post.merchantName}`);
      }
      txnIdByPostIdx.push(txn.id);
    }

    // 5. Posts — denormalize card + institution from account onto the post so
    // the friends UI can render card chip without joining back to financial_account.
    await tx.insert(socialPost).values(
      DEMO_POSTS.map((post, idx) => {
        const acct = accountByUser.get(post.userId);
        return {
          amountCents: post.amountCents,
          cardName: acct?.name ?? null,
          categorySystemKey: post.categorySystemKey,
          date: new Date(now - post.daysAgo * MS_PER_DAY),
          institutionName: acct?.institutionName ?? null,
          lat: post.lat,
          logoUrl: `https://www.google.com/s2/favicons?domain=${post.logoDomain}&sz=128`,
          lon: post.lon,
          merchantName: post.merchantName,
          note: post.note ?? null,
          transactionId: txnIdByPostIdx[idx] as string,
          userId: post.userId,
          website: post.website,
        };
      }),
    );

    // 5. Friendships — root <-> every friend. Check constraint requires
    // userAId < userBId, so sort the pair.
    await tx.insert(socialFriendship).values(
      DEMO_FRIEND_IDS.map((friendId) => {
        const [a, b] = sortedPair(DEMO_ROOT_ID, friendId);
        return { userAId: a, userBId: b };
      }),
    );
  });
}

/**
 * Inserts the same 16 system category groups + 88 categories that
 * `seedUserCategories` in @cobalt-web/auth creates on user sign-up. Duplicated
 * here so the demo seed doesn't drag the auth package into @cobalt-web/db.
 */
async function seedSystemCategoriesForUser(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
): Promise<void> {
  await tx.execute(sql`
WITH seed_groups (system_key, name, "order") AS (
  VALUES
    ('food_and_drink',           'Food & Drink',             10),
    ('transportation',           'Transportation',           20),
    ('rent_and_utilities',       'Rent & Utilities',         30),
    ('home_improvement',         'Home Improvement',         40),
    ('general_merchandise',      'Shopping',                 50),
    ('medical',                  'Medical',                  60),
    ('personal_care',            'Personal Care',            70),
    ('entertainment',            'Entertainment',            80),
    ('travel',                   'Travel',                   90),
    ('general_services',         'Services',                100),
    ('bank_fees',                'Bank Fees',               110),
    ('loan_payments',            'Loan Payments',           120),
    ('government_and_non_profit','Government & Non-Profit', 130),
    ('transfers',                'Transfers',               140),
    ('income',                   'Income',                  150),
    ('other',                    'Other',                   160)
),
target_user AS (
  SELECT ${userId}::text AS user_id
  WHERE NOT EXISTS (
    SELECT 1 FROM category_group cg WHERE cg.user_id = ${userId}::text
  )
),
inserted_groups AS (
  INSERT INTO category_group (user_id, system_key, name, "order")
  SELECT tu.user_id, sg.system_key, sg.name, sg."order"
  FROM target_user tu
  CROSS JOIN seed_groups sg
  RETURNING id, user_id, system_key
),
seed_cats (group_key, system_key, name, exclude_from_insights, ord) AS (
  VALUES
    ('food_and_drink',  'groceries',           'Groceries',          false,  10),
    ('food_and_drink',  'restaurants',         'Restaurants',        false,  20),
    ('food_and_drink',  'coffee_shop',         'Coffee Shops',       false,  30),
    ('food_and_drink',  'alcohol_bars',        'Alcohol & Bars',     false,  40),
    ('food_and_drink',  'food_delivery',       'Food Delivery',      false,  50),
    ('food_and_drink',  'snacks',              'Snacks',             false,  60),
    ('transportation',  'public_transit',      'Public Transit',     false,  10),
    ('transportation',  'taxi',                'Rideshare & Taxi',   false,  20),
    ('transportation',  'gas_fuel',            'Gas & Fuel',         false,  30),
    ('transportation',  'parking',             'Parking',            false,  40),
    ('transportation',  'toll',                'Tolls',              false,  50),
    ('transportation',  'bike_scooter',        'Bikes & Scooters',   false,  60),
    ('transportation',  'auto_maintenance',    'Auto Maintenance',   false,  70),
    ('transportation',  'other_transportation','Other Transportation',false, 80),
    ('rent_and_utilities', 'rent_mortgage',    'Rent',               false,  10),
    ('rent_and_utilities', 'energy',           'Gas & Electric',     false,  20),
    ('rent_and_utilities', 'internet',         'Internet & Cable',   false,  30),
    ('rent_and_utilities', 'phone',            'Phone',              false,  40),
    ('rent_and_utilities', 'water',            'Water',              false,  50),
    ('rent_and_utilities', 'waste',            'Waste',              false,  60),
    ('rent_and_utilities', 'other_utilities',  'Other Utilities',    false,  70),
    ('home_improvement','home_maintenance',    'Home Maintenance',   false,  10),
    ('home_improvement','furniture',           'Furniture',          false,  20),
    ('home_improvement','hardware',            'Hardware',           false,  30),
    ('home_improvement','security',            'Security',           false,  40),
    ('home_improvement','other_home',          'Other Home',         false,  50),
    ('general_merchandise','shopping',         'General Shopping',   false,  10),
    ('general_merchandise','clothing',         'Clothing',           false,  20),
    ('general_merchandise','electronics',      'Electronics',        false,  30),
    ('general_merchandise','convenience_store','Convenience Store',  false,  40),
    ('general_merchandise','gift',             'Gifts',              false,  50),
    ('medical',         'primary',             'Primary Care',       false,  10),
    ('medical',         'dental',              'Dental',             false,  20),
    ('medical',         'eye_doctor',          'Eye Care',           false,  30),
    ('medical',         'pharmacy',            'Pharmacy',           false,  40),
    ('medical',         'nursing',             'Nursing',            false,  50),
    ('medical',         'vet',                 'Veterinary',         false,  60),
    ('medical',         'other_medical',       'Other Medical',      false,  70),
    ('personal_care',   'fitness',             'Gym & Fitness',      false,  10),
    ('personal_care',   'hair_beauty',         'Hair & Beauty',      false,  20),
    ('personal_care',   'laundry',             'Laundry',            false,  30),
    ('personal_care',   'vape',                'Tobacco & Vape',     false,  40),
    ('personal_care',   'other_personal_care', 'Other Personal Care',false,  50),
    ('entertainment',   'movies',              'TV & Movies',        false,  10),
    ('entertainment',   'streaming',           'Streaming',          false,  20),
    ('entertainment',   'music',               'Music',              false,  30),
    ('entertainment',   'video_games',         'Video Games',        false,  40),
    ('entertainment',   'event',               'Events',             false,  50),
    ('entertainment',   'sporting_goods',      'Sporting Goods',     false,  60),
    ('entertainment',   'books_media',         'Books & Media',      false,  70),
    ('entertainment',   'gambling',            'Gambling',           false,  80),
    ('entertainment',   'other_entertainment', 'Other Entertainment',false,  90),
    ('travel',          'flights',             'Flights',            false,  10),
    ('travel',          'hotels',              'Hotels',             false,  20),
    ('travel',          'rentals',             'Rental Cars',        false,  30),
    ('travel',          'other_travel',        'Other Travel',       false,  40),
    ('general_services','childcare',           'Childcare',          false,  10),
    ('general_services','education',           'Education',          false,  20),
    ('general_services','financial_service',   'Financial Services', false,  30),
    ('general_services','insurance',           'Insurance',          false,  40),
    ('general_services','legal',               'Legal & Consulting', false,  50),
    ('general_services','office_supplies',     'Office Supplies',    false,  60),
    ('general_services','pets',                'Pets',               false,  70),
    ('general_services','shipping',            'Shipping',           false,  80),
    ('general_services','storage',             'Storage',            false,  90),
    ('general_services','other_services',      'Other Services',     false, 100),
    ('bank_fees',       'atm',                 'ATM Fee',            false,  10),
    ('bank_fees',       'foreign_transaction', 'Foreign Transaction',false,  20),
    ('bank_fees',       'insufficient',        'Insufficient Funds', false,  30),
    ('bank_fees',       'interest',            'Interest Charge',    false,  40),
    ('bank_fees',       'overdraft',           'Overdraft',          false,  50),
    ('bank_fees',       'other_bank_fees',     'Other Bank Fees',    false,  60),
    ('loan_payments',   'mortgage_payment',    'Mortgage',           false,  10),
    ('loan_payments',   'car_payment',         'Car Payment',        true,   20),
    ('loan_payments',   'credit_card_payment', 'Credit Card Payment',true,   30),
    ('loan_payments',   'student_loan',        'Student Loan',       true,   40),
    ('loan_payments',   'other_loan',          'Other Loan',         true,   50),
    ('government_and_non_profit','taxes',          'Taxes',          false,  10),
    ('government_and_non_profit','donations',      'Donations',      false,  20),
    ('government_and_non_profit','government_fee', 'Government Fee', false,  30),
    ('government_and_non_profit','other_government','Other Government',false, 40),
    ('transfers',       'deposit',             'Deposit',            true,   10),
    ('transfers',       'withdrawal',          'Withdrawal',         true,   20),
    ('transfers',       'account_transfer',    'Account Transfer',   true,   30),
    ('transfers',       'savings_transfer',    'Savings Transfer',   true,   40),
    ('transfers',       'investment_transfer', 'Investment Transfer',true,   50),
    ('transfers',       'cash_advance',        'Cash Advance',       true,   60),
    ('transfers',       'other_transfer',      'Other Transfer',     true,   70),
    ('income',          'paycheck',            'Paycheck',           false,  10),
    ('income',          'bonus',               'Bonus',              false,  20),
    ('income',          'freelance',           'Freelance',          false,  30),
    ('income',          'cashback',            'Cashback',           false,  40),
    ('income',          'tax_returns',         'Tax Refund',         false,  50),
    ('income',          'unemployment',        'Unemployment',       false,  60),
    ('income',          'pension',             'Pension',            false,  70),
    ('income',          'gift_received',       'Gift Received',      false,  80),
    ('income',          'dividend',            'Dividend',           true,   90),
    ('income',          'interest_received',   'Interest Received',  true,  100),
    ('income',          'other_income',        'Other Income',       false, 110),
    ('other',           'uncategorized',       'Uncategorized',      false,  10)
)
INSERT INTO category (user_id, group_id, system_key, name, icon_key, exclude_from_insights, "order")
SELECT
  ig.user_id,
  ig.id,
  sc.system_key,
  sc.name,
  sc.system_key,
  sc.exclude_from_insights,
  sc.ord
FROM inserted_groups ig
JOIN seed_cats sc ON sc.group_key = ig.system_key
  `);
}
