import { inArray } from "drizzle-orm";

import { db } from "../index";
import { financialAccount } from "../schema/accounts/account";
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
}

const DEMO_USERS: DemoNetworkUser[] = [
  {
    id: DEMO_ROOT_ID,
    name: "John Doe",
    username: "johndoe",
    displayUsername: "johndoe",
    email: "demo@demo.cobalt.internal",
    image: "https://api.dicebear.com/9.x/notionists/svg?seed=johndoe",
  },
  {
    id: "demo-friend-ava",
    name: "Ava Chen",
    username: "ava",
    displayUsername: "ava",
    email: "ava@demo.cobalt.internal",
    image: "https://api.dicebear.com/9.x/notionists/svg?seed=ava",
  },
  {
    id: "demo-friend-ben",
    name: "Ben Park",
    username: "ben",
    displayUsername: "ben",
    email: "ben@demo.cobalt.internal",
    image: "https://api.dicebear.com/9.x/notionists/svg?seed=ben",
  },
  {
    id: "demo-friend-cleo",
    name: "Cleo Reyes",
    username: "cleo",
    displayUsername: "cleo",
    email: "cleo@demo.cobalt.internal",
    image: "https://api.dicebear.com/9.x/notionists/svg?seed=cleo",
  },
  {
    id: "demo-friend-dax",
    name: "Dax Miller",
    username: "dax",
    displayUsername: "dax",
    email: "dax@demo.cobalt.internal",
    image: "https://api.dicebear.com/9.x/notionists/svg?seed=dax",
  },
  {
    id: "demo-friend-eli",
    name: "Eli Tanaka",
    username: "eli",
    displayUsername: "eli",
    email: "eli@demo.cobalt.internal",
    image: "https://api.dicebear.com/9.x/notionists/svg?seed=eli",
  },
];

interface DemoPostSeed {
  userId: string;
  merchantName: string;
  lat: number;
  lon: number;
  amountCents: number;
  daysAgo: number;
  note?: string;
}

// Real coords: SF Mission/SOMA + NYC Williamsburg/LES. Tight-cluster so the
// initial map view shows many pins without zooming.
const DEMO_POSTS: DemoPostSeed[] = [
  // SF — root + 2 friends
  {
    userId: DEMO_ROOT_ID,
    merchantName: "Blue Bottle Coffee",
    lat: 37.7762,
    lon: -122.4233,
    amountCents: 575,
    daysAgo: 1,
    note: "morning meeting",
  },
  {
    userId: DEMO_ROOT_ID,
    merchantName: "Tartine Bakery",
    lat: 37.7614,
    lon: -122.4241,
    amountCents: 1840,
    daysAgo: 3,
  },
  {
    userId: "demo-friend-ava",
    merchantName: "Sightglass Coffee",
    lat: 37.7766,
    lon: -122.4106,
    amountCents: 650,
    daysAgo: 1,
  },
  {
    userId: "demo-friend-ava",
    merchantName: "Foreign Cinema",
    lat: 37.7563,
    lon: -122.4187,
    amountCents: 8450,
    daysAgo: 5,
    note: "dinner w/ team",
  },
  {
    userId: "demo-friend-ben",
    merchantName: "Philz Coffee",
    lat: 37.7639,
    lon: -122.4218,
    amountCents: 525,
    daysAgo: 2,
  },
  {
    userId: "demo-friend-ben",
    merchantName: "Nopa",
    lat: 37.7749,
    lon: -122.4376,
    amountCents: 9200,
    daysAgo: 6,
  },
  // NYC — 3 friends
  {
    userId: "demo-friend-cleo",
    merchantName: "Devoción",
    lat: 40.7193,
    lon: -73.9577,
    amountCents: 625,
    daysAgo: 2,
  },
  {
    userId: "demo-friend-cleo",
    merchantName: "Lilia",
    lat: 40.7165,
    lon: -73.9477,
    amountCents: 11800,
    daysAgo: 7,
    note: "anniversary",
  },
  {
    userId: "demo-friend-dax",
    merchantName: "Joe's Pizza",
    lat: 40.7307,
    lon: -74.0024,
    amountCents: 475,
    daysAgo: 1,
  },
  {
    userId: "demo-friend-dax",
    merchantName: "Russ & Daughters",
    lat: 40.7223,
    lon: -73.9882,
    amountCents: 2300,
    daysAgo: 4,
  },
  {
    userId: "demo-friend-eli",
    merchantName: "Variety Coffee",
    lat: 40.7177,
    lon: -73.9591,
    amountCents: 550,
    daysAgo: 2,
  },
  {
    userId: "demo-friend-eli",
    merchantName: "Roberta's",
    lat: 40.7053,
    lon: -73.9335,
    amountCents: 6800,
    daysAgo: 5,
  },
];

const MS_PER_DAY = 86_400_000;

/** Sort string ids so they satisfy `social_friendship_sorted_chk`. */
function sortedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function seedDemoNetwork(): Promise<void> {
  const ids = [...DEMO_NETWORK_IDS];

  // Order matters only for `user`: cascade FKs on transaction, account,
  // friendship, post wipe everything else when we delete the users. Doing it
  // explicit anyway so partial seeds (e.g. user row missing) still clean.
  await db.delete(socialPost).where(inArray(socialPost.userId, ids));
  await db.delete(socialFriendship).where(inArray(socialFriendship.userAId, ids));
  await db.delete(socialFriendship).where(inArray(socialFriendship.userBId, ids));
  await db.delete(transaction).where(inArray(transaction.userId, ids));
  await db.delete(financialAccount).where(inArray(financialAccount.userId, ids));
  await db.delete(user).where(inArray(user.id, ids));

  // 1. Users
  await db.insert(user).values(
    DEMO_USERS.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      displayUsername: u.displayUsername,
      email: u.email,
      emailVerified: true,
      image: u.image,
      // NOT anonymous — shared landing network, not per-visitor demo. Cleanup
      // cron sweeps isAnonymous rows; we want these to stick.
      isAnonymous: false,
    })),
  );

  // 2. One manual financial account per user (txn FK needs it).
  const accountByUser = new Map<string, string>();
  for (const u of DEMO_USERS) {
    const [acct] = await db
      .insert(financialAccount)
      .values({
        userId: u.id,
        name: "Demo Card",
        type: "credit",
        source: "manual",
      })
      .returning({ id: financialAccount.id });
    if (!acct) {
      throw new Error(`seed-demo-network: failed to insert account for ${u.id}`);
    }
    accountByUser.set(u.id, acct.id);
  }

  // 3. Transactions — one per post (post.transactionId is required + unique
  // on (userId, transactionId)). Date = post date, amount in dollars.
  const now = Date.now();
  const txnIdByPostIdx: string[] = [];
  for (const post of DEMO_POSTS) {
    const acctId = accountByUser.get(post.userId);
    if (!acctId) {
      throw new Error(`seed-demo-network: missing account for ${post.userId}`);
    }
    const isoDate = new Date(now - post.daysAgo * MS_PER_DAY).toISOString().slice(0, 10);
    const [txn] = await db
      .insert(transaction)
      .values({
        userId: post.userId,
        accountId: acctId,
        name: post.merchantName,
        amount: (post.amountCents / 100).toFixed(4),
        date: isoDate,
        source: "manual",
        pending: false,
        excluded: false,
        lat: post.lat,
        lon: post.lon,
      })
      .returning({ id: transaction.id });
    if (!txn) {
      throw new Error(`seed-demo-network: failed to insert txn for ${post.merchantName}`);
    }
    txnIdByPostIdx.push(txn.id);
  }

  // 4. Posts
  await db.insert(socialPost).values(
    DEMO_POSTS.map((post, idx) => ({
      userId: post.userId,
      transactionId: txnIdByPostIdx[idx]!,
      merchantName: post.merchantName,
      amountCents: post.amountCents,
      lat: post.lat,
      lon: post.lon,
      date: new Date(now - post.daysAgo * MS_PER_DAY),
      note: post.note ?? null,
    })),
  );

  // 5. Friendships — root <-> every friend. Check constraint requires
  // userAId < userBId, so sort the pair.
  await db.insert(socialFriendship).values(
    DEMO_FRIEND_IDS.map((friendId) => {
      const [a, b] = sortedPair(DEMO_ROOT_ID, friendId);
      return { userAId: a, userBId: b };
    }),
  );
}
