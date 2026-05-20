import { and, eq, inArray } from "drizzle-orm";

import { db } from "../index";
import { financialAccount } from "../schema/accounts/account";
import { balance } from "../schema/accounts/balance";
import { snapshot } from "../schema/accounts/snapshot";
import { category } from "../schema/accounts/banking/categories/category";
import { tag } from "../schema/accounts/banking/tags/tag";
import { transactionTag } from "../schema/accounts/banking/tags/transaction-tag";
import { recurring } from "../schema/accounts/banking/transactions/recurring";
import { transaction } from "../schema/accounts/banking/transactions/transaction";
import { holding } from "../schema/accounts/investments/holding";
import { investmentActivity } from "../schema/accounts/investments/investment-activity";
import { security } from "../schema/accounts/investments/security";
import { chats, messages, parts } from "../schema/ai/chat";

import {
  DEMO_ACCOUNTS,
  DEMO_CHATS,
  DEMO_HOLDINGS,
  DEMO_INVESTMENT_ACTIVITY,
  DEMO_MERCHANT_WEBSITES,
  DEMO_RECURRING,
  DEMO_SNAPSHOT_TRAJECTORIES,
  DEMO_TAGS,
  DEMO_TXNS,
} from "./fixtures";

import type { DemoAccountSeed, DemoRecurringSeed, DemoTxnSeed } from "./fixtures";

/**
 * Sorted-by-length helper for `websiteForMerchant`. Longer keys first so
 * "blue bottle coffee" matches before "blue bottle". Module-scoped so the
 * sort runs once, not per-transaction.
 */
const MERCHANT_PREFIXES = Object.keys(DEMO_MERCHANT_WEBSITES).toSorted(
  (a, b) => b.length - a.length,
);

function websiteForMerchant(merchantName: string | undefined): string | undefined {
  if (!merchantName) {
    return undefined;
  }
  const key = merchantName.toLowerCase();
  const direct = DEMO_MERCHANT_WEBSITES[key];
  if (direct) {
    return `https://${direct}`;
  }
  // Prefix-only match. `includes` was too loose (e.g. "uber" matched
  // "Hubert's"); `startsWith` keeps "Blue Bottle Coffee" → "blue bottle"
  // without surprises.
  for (const k of MERCHANT_PREFIXES) {
    if (key.startsWith(k)) {
      return `https://${DEMO_MERCHANT_WEBSITES[k]}`;
    }
  }
  return undefined;
}

const MS_PER_DAY = 86_400_000;
const SNAPSHOT_DAYS_BACK = 180;
const SNAPSHOT_STEP_DAYS = 7;

const INTERVAL_DAYS: Record<DemoRecurringSeed["frequency"], number> = {
  ANNUALLY: 365,
  BIWEEKLY: 14,
  MONTHLY: 30,
  SEMI_MONTHLY: 15,
  UNKNOWN: 30,
  WEEKLY: 7,
};

type Database = typeof db;
interface InsertedTxn {
  id: string;
  fixture: DemoTxnSeed;
  date: string;
}

/**
 * Look up the user's category rows (seeded by Better Auth's user.create hook).
 * Returns a map keyed by `category.system_key` so fixture rows can reference
 * categories without UUIDs.
 */
async function loadUserCategories(database: Database, userId: string) {
  const userCats = await database
    .select({ id: category.id, systemKey: category.systemKey })
    .from(category)
    .where(eq(category.userId, userId));
  const byKey = new Map<string, string>();
  for (const row of userCats) {
    if (row.systemKey) {
      byKey.set(row.systemKey, row.id);
    }
  }
  const uncategorizedId = byKey.get("uncategorized");
  if (!uncategorizedId) {
    throw new Error(
      `demo seed: user ${userId} missing uncategorized category — run seedUserCategories first`,
    );
  }
  return { byKey, uncategorizedId };
}

async function seedAccountsAndBalances(database: Database, userId: string) {
  // Bulk insert accounts with `.returning()`, then bulk insert balances in a
  // single round-trip each. Drizzle preserves input order in returning, so we
  // can zip back to fixture keys without a second SELECT.
  const accountRows = await database
    .insert(financialAccount)
    .values(
      DEMO_ACCOUNTS.map((acct) => ({
        institutionName: acct.institutionName,
        logoDomain: acct.logoDomain,
        mask: acct.mask,
        name: acct.name,
        source: acct.source ?? "manual",
        subtype: acct.subtype,
        type: acct.type,
        userId,
      })),
    )
    .returning({ id: financialAccount.id });

  const accountIdByKey = new Map<string, string>();
  const now = new Date();
  const balanceRows = DEMO_ACCOUNTS.flatMap((acct, idx) => {
    const id = accountRows[idx]?.id;
    if (!id) {
      throw new Error(`demo seed: insert account ${acct.key} failed`);
    }
    accountIdByKey.set(acct.key, id);
    return [
      {
        accountId: id,
        creditLimit: acct.creditLimit,
        currency: "USD",
        current: acct.balance,
        lastSyncAt: now,
        userId,
      },
    ];
  });
  await database.insert(balance).values(balanceRows);
  return accountIdByKey;
}

async function seedTags(database: Database, userId: string) {
  const tagIdByKey = new Map<string, string>();
  if (DEMO_TAGS.length === 0) {
    return tagIdByKey;
  }
  const tagRows = await database
    .insert(tag)
    .values(DEMO_TAGS.map((t) => ({ color: t.color, name: t.name, userId })))
    .returning({ id: tag.id, name: tag.name });
  const tagIdByName = new Map(tagRows.map((row) => [row.name.toLowerCase(), row.id]));
  for (const t of DEMO_TAGS) {
    const id = tagIdByName.get(t.name.toLowerCase());
    if (id) {
      tagIdByKey.set(t.key, id);
    }
  }
  return tagIdByKey;
}

async function seedTransactionsAndTags(
  database: Database,
  userId: string,
  now: Date,
  accountIdByKey: Map<string, string>,
  catBySystemKey: Map<string, string>,
  uncategorizedId: string,
  tagIdByKey: Map<string, string>,
): Promise<InsertedTxn[]> {
  const txnRowsWithFixtures = DEMO_TXNS.map((tx) => {
    const accountId = accountIdByKey.get(tx.accountKey);
    if (!accountId) {
      throw new Error(`demo seed: txn references unknown accountKey ${tx.accountKey}`);
    }
    const date = new Date(now.getTime() - tx.daysAgo * MS_PER_DAY);
    const website = websiteForMerchant(tx.merchantName);
    return {
      fixture: tx,
      row: {
        accountId,
        address: tx.address,
        amount: tx.amount,
        categoryId: catBySystemKey.get(tx.categoryKey) ?? uncategorizedId,
        city: tx.city,
        country: tx.country,
        currency: "USD",
        date: date.toISOString().slice(0, 10),
        lat: tx.lat,
        logoUrl: website ? `${website}` : undefined,
        lon: tx.lon,
        merchantName: tx.merchantName,
        name: tx.name,
        notes: tx.notes,
        pending: tx.pending ?? false,
        postalCode: tx.postalCode,
        region: tx.region,
        source: "manual" as const,
        userId,
        website,
      },
    };
  });
  if (txnRowsWithFixtures.length === 0) {
    return [];
  }
  const inserted = await database
    .insert(transaction)
    .values(txnRowsWithFixtures.map((p) => p.row))
    .returning({ id: transaction.id });
  // Pair returned ids with their fixture inputs; Drizzle preserves input order.
  const insertedTxns: InsertedTxn[] = txnRowsWithFixtures.flatMap((pair, idx) => {
    const txnId = inserted[idx]?.id;
    return txnId ? [{ date: pair.row.date, fixture: pair.fixture, id: txnId }] : [];
  });
  // Derive transaction_tag rows by flat-mapping each inserted txn's tagKeys.
  const tagLinks = insertedTxns.flatMap(({ id, fixture }) =>
    (fixture.tagKeys ?? []).flatMap((key) => {
      const tagId = tagIdByKey.get(key);
      return tagId ? [{ tagId, transactionId: id }] : [];
    }),
  );
  if (tagLinks.length > 0) {
    await database.insert(transactionTag).values(tagLinks);
  }
  return insertedTxns;
}

/**
 * Resolve every fixture ticker's `security.id` in at most two batched
 * round-trips: one SELECT for tickers already shared in the global security
 * table, one INSERT for the rest. Returns ticker → id map. Replaces the
 * per-holding SELECT-then-maybe-INSERT loop.
 */
async function resolveSecurityIdsByTicker(
  database: Database,
  asOf: string,
): Promise<Map<string, string>> {
  const fixtures = new Map<string, (typeof DEMO_HOLDINGS)[number]>();
  for (const h of DEMO_HOLDINGS) {
    fixtures.set(h.ticker, h);
  }
  const tickers = [...fixtures.keys()];
  if (tickers.length === 0) {
    return new Map();
  }
  const existing = await database
    .select({ id: security.id, ticker: security.tickerSymbol })
    .from(security)
    .where(and(eq(security.type, "equity"), inArray(security.tickerSymbol, tickers)));
  const idByTicker = new Map<string, string>();
  for (const row of existing) {
    if (row.ticker) {
      idByTicker.set(row.ticker, row.id);
    }
  }
  const missing = tickers.filter((t) => !idByTicker.has(t));
  if (missing.length > 0) {
    const inserted = await database
      .insert(security)
      .values(
        missing.map((ticker) => {
          const h = fixtures.get(ticker);
          if (!h) {
            throw new Error(`demo seed: unknown ticker ${ticker}`);
          }
          return {
            closePrice: h.price,
            closePriceAsOf: asOf,
            currency: "USD",
            name: h.name,
            source: "manual" as const,
            tickerSymbol: ticker,
            type: "equity",
          };
        }),
      )
      .returning({ id: security.id, tickerSymbol: security.tickerSymbol });
    for (const row of inserted) {
      if (row.tickerSymbol) {
        idByTicker.set(row.tickerSymbol, row.id);
      }
    }
  }
  return idByTicker;
}

async function seedHoldings(
  database: Database,
  userId: string,
  now: Date,
  accountIdByKey: Map<string, string>,
) {
  const asOf = now.toISOString().slice(0, 10);
  const securityIdByTicker = await resolveSecurityIdsByTicker(database, asOf);
  const rows = DEMO_HOLDINGS.flatMap((h) => {
    const accountId = accountIdByKey.get(h.accountKey);
    const securityId = securityIdByTicker.get(h.ticker);
    if (!(accountId && securityId)) {
      return [];
    }
    return [
      {
        accountId,
        costBasis: h.costBasis,
        currency: "USD",
        institutionPrice: h.price,
        institutionValue: (Number(h.quantity) * Number(h.price)).toFixed(4),
        lastSyncAt: now,
        quantity: h.quantity,
        securityId,
        source: "manual" as const,
        userId,
      },
    ];
  });
  if (rows.length > 0) {
    await database.insert(holding).values(rows);
  }
}

/**
 * Match inserted txns by (accountKey, merchantName) to derive each recurring
 * stream's transactionIds + averageAmount + first/last/next dates.
 */
async function seedRecurringStreams(
  database: Database,
  userId: string,
  insertedTxns: InsertedTxn[],
  accountIdByKey: Map<string, string>,
  catBySystemKey: Map<string, string>,
  uncategorizedId: string,
) {
  // Single O(N) pass to bucket inserted txns by (accountKey, merchant). Each
  // bucket is also pre-sorted by date so we can read first/last in O(1) below.
  // Replaces a per-stream `.filter(...).toSorted(...)` scan that was O(streams × txns).
  const byKey = new Map<string, InsertedTxn[]>();
  for (const t of insertedTxns) {
    const merchant = t.fixture.merchantName?.toLowerCase();
    if (!merchant) {
      continue;
    }
    const key = `${t.fixture.accountKey}|${merchant}`;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.push(t);
    } else {
      byKey.set(key, [t]);
    }
  }
  for (const bucket of byKey.values()) {
    bucket.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  const rows: (typeof recurring.$inferInsert)[] = [];
  for (const stream of DEMO_RECURRING) {
    const accountId = accountIdByKey.get(stream.accountKey);
    if (!accountId) {
      continue;
    }
    const matches = byKey.get(`${stream.accountKey}|${stream.merchantName.toLowerCase()}`) ?? [];
    const [first] = matches;
    const last = matches.at(-1);
    if (!(first && last)) {
      continue;
    }
    const amounts = matches.map((m) => Math.abs(Number(m.fixture.amount)));
    const avg = amounts.reduce((sum, n) => sum + n, 0) / amounts.length;
    const next = new Date(`${last.date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + INTERVAL_DAYS[stream.frequency]);
    rows.push({
      accountId,
      averageAmount: avg.toFixed(4),
      categoryId: catBySystemKey.get(stream.categoryKey) ?? uncategorizedId,
      description: stream.description,
      firstDate: first.date,
      frequency: stream.frequency,
      isActive: true,
      lastAmount: Math.abs(Number(last.fixture.amount)).toFixed(4),
      lastDate: last.date,
      merchantName: stream.merchantName,
      predictedNextDate: next.toISOString().slice(0, 10),
      source: "manual",
      status: "MATURE",
      streamType: stream.streamType,
      transactionIds: matches.map((m) => m.id),
      userId,
    });
  }
  if (rows.length > 0) {
    await database.insert(recurring).values(rows);
  }
}

/**
 * Weekly snapshots over the trailing 180d. Linear interp + deterministic
 * sinusoidal wiggle — no randomness, every demo user sees an identical chart.
 */
async function seedSnapshots(
  database: Database,
  userId: string,
  now: Date,
  accountIdByKey: Map<string, string>,
) {
  const accountByKey = new Map<string, DemoAccountSeed>(DEMO_ACCOUNTS.map((a) => [a.key, a]));
  const rows: (typeof snapshot.$inferInsert)[] = [];
  for (const traj of DEMO_SNAPSHOT_TRAJECTORIES) {
    const accountId = accountIdByKey.get(traj.accountKey);
    const account = accountByKey.get(traj.accountKey);
    if (!(accountId && account)) {
      continue;
    }
    const endBalance = Number(account.balance);
    const span = endBalance - traj.startBalance;
    const wiggleAmp = Math.abs(span || endBalance) * traj.volatility;
    for (let daysAgo = SNAPSHOT_DAYS_BACK; daysAgo >= 0; daysAgo -= SNAPSHOT_STEP_DAYS) {
      const t = 1 - daysAgo / SNAPSHOT_DAYS_BACK;
      const base = traj.startBalance + span * t;
      const wiggle = Math.sin(t * Math.PI * 3) * wiggleAmp;
      const value = Math.max(0, base + wiggle);
      const snapshotDate = new Date(now.getTime() - daysAgo * MS_PER_DAY);
      rows.push({
        accountId,
        creditLimit: account.creditLimit,
        currency: "USD",
        current: value.toFixed(2),
        snapshotDate: snapshotDate.toISOString().slice(0, 10),
        source: "manual",
        userId,
      });
    }
  }
  if (rows.length > 0) {
    await database.insert(snapshot).values(rows);
  }
}

async function seedInvestmentActivities(
  database: Database,
  userId: string,
  now: Date,
  accountIdByKey: Map<string, string>,
) {
  if (DEMO_INVESTMENT_ACTIVITY.length === 0) {
    return;
  }
  // Map ticker → security.id for activities that reference a specific holding.
  const tickers = [...new Set(DEMO_INVESTMENT_ACTIVITY.map((a) => a.ticker).filter(Boolean))];
  const securityIdByTicker = new Map<string, string>();
  if (tickers.length > 0) {
    const rows = await database
      .select({ id: security.id, ticker: security.tickerSymbol })
      .from(security)
      .where(eq(security.type, "equity"));
    for (const row of rows) {
      if (row.ticker) {
        securityIdByTicker.set(row.ticker, row.id);
      }
    }
  }
  const activityRows: (typeof investmentActivity.$inferInsert)[] = [];
  for (const a of DEMO_INVESTMENT_ACTIVITY) {
    const accountId = accountIdByKey.get(a.accountKey);
    if (!accountId) {
      continue;
    }
    const date = new Date(now.getTime() - a.daysAgo * MS_PER_DAY);
    activityRows.push({
      accountId,
      amount: a.amount,
      currency: "USD",
      date: date.toISOString().slice(0, 10),
      fees: a.fees,
      name: a.name,
      price: a.price,
      quantity: a.quantity,
      securityId: a.ticker ? securityIdByTicker.get(a.ticker) : undefined,
      settlementDate: date.toISOString().slice(0, 10),
      source: "manual",
      type: a.type,
      userId,
    });
  }
  if (activityRows.length > 0) {
    await database.insert(investmentActivity).values(activityRows);
  }
}

async function seedChatThreads(database: Database, userId: string, now: Date) {
  // Build all chat / message / part rows in memory, then bulk-insert each
  // table once. The chat table is the FK target for messages, and messages
  // are the FK target for parts, so we order: chats → messages → parts.
  const chatRows: (typeof chats.$inferInsert)[] = [];
  const messageRows: (typeof messages.$inferInsert)[] = [];
  const partRows: (typeof parts.$inferInsert)[] = [];
  for (const chatFixture of DEMO_CHATS) {
    const chatId = crypto.randomUUID();
    const chatCreatedAt = new Date(now.getTime() - chatFixture.daysAgo * MS_PER_DAY);
    chatRows.push({
      chatId,
      createdAt: chatCreatedAt,
      title: chatFixture.title,
      updatedAt: chatCreatedAt,
      userId,
    });
    for (const msg of chatFixture.messages) {
      const messageId = crypto.randomUUID();
      const createdAt = new Date(now.getTime() - msg.minutesAgo * 60_000);
      messageRows.push({ chatId, createdAt, messageId, role: msg.role });
      partRows.push({
        createdAt,
        messageId,
        order: 0,
        partId: crypto.randomUUID(),
        text_text: msg.text,
        type: "text",
      });
    }
  }
  if (chatRows.length > 0) {
    await database.insert(chats).values(chatRows);
  }
  if (messageRows.length > 0) {
    await database.insert(messages).values(messageRows);
  }
  if (partRows.length > 0) {
    await database.insert(parts).values(partRows);
  }
}

/**
 * Seed all demo rows for a freshly-created demo user.
 * Assumes seedUserCategories already ran (via Better Auth user.create hook).
 *
 * Dates are shifted relative to "now" at call time so the demo always looks
 * fresh regardless of when the user enters demo mode.
 */
export async function seedDemoUser(userId: string): Promise<void> {
  const database = db;
  const now = new Date();
  const { byKey: catBySystemKey, uncategorizedId } = await loadUserCategories(database, userId);

  // Stage 1: independent prerequisites. Accounts and tags share no FKs with
  // each other (categories already exist), so they race.
  const [accountIdByKey, tagIdByKey] = await Promise.all([
    seedAccountsAndBalances(database, userId),
    seedTags(database, userId),
  ]);

  // Stage 2: transactions need accounts + categories + tags. Holdings,
  // snapshots, activities, and chats only need accounts (or nothing) — they
  // can race against transactions. Recurring streams need txn ids, so they
  // run after.
  const [insertedTxns] = await Promise.all([
    seedTransactionsAndTags(
      database,
      userId,
      now,
      accountIdByKey,
      catBySystemKey,
      uncategorizedId,
      tagIdByKey,
    ),
    seedHoldings(database, userId, now, accountIdByKey),
    seedSnapshots(database, userId, now, accountIdByKey),
    seedInvestmentActivities(database, userId, now, accountIdByKey),
    seedChatThreads(database, userId, now),
  ]);

  // Stage 3: recurring streams aggregate over the just-inserted txns.
  await seedRecurringStreams(
    database,
    userId,
    insertedTxns,
    accountIdByKey,
    catBySystemKey,
    uncategorizedId,
  );
}
