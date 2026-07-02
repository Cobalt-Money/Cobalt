import { and, eq, inArray } from "drizzle-orm";
import { setImmediate as yieldToEventLoop, setTimeout as sleep } from "node:timers/promises";

import { db } from "../index";
import { financialAccount } from "../schema/accounts/account";
import { balance } from "../schema/accounts/balance";
import { snapshot } from "../schema/accounts/snapshot";
import { category } from "../schema/accounts/banking/categories/category";
import { tag } from "../schema/accounts/banking/tags/tag";
import { transactionTag } from "../schema/accounts/banking/tags/transaction-tag";
import { transaction } from "../schema/accounts/banking/transactions/transaction";
import { holding } from "../schema/accounts/investments/holding";
import { investmentActivity } from "../schema/accounts/investments/investment-activity";
import { security } from "../schema/accounts/investments/security";
import { chats, messages, parts } from "../schema/ai/chat";

import { DEMO_INSERT_BATCH_SIZE } from "./config";
import { DEMO_ACCOUNTS, DEMO_HOLDINGS, DEMO_INVESTMENT_ACTIVITY, DEMO_TAGS } from "./fixtures";
import {
  demoTxnDate,
  generateDemoChats,
  iterateDemoSnapshots,
  iterateDemoTransactions,
  websiteForGeneratedMerchant,
} from "./generators";

import type { DemoTxnSeed } from "./fixtures";

const MS_PER_DAY = 86_400_000;

// Every this-many inserted rows within a phase, sleep so PlanetScale's WAL can
// drain into zero-cache without a giant single-tick burst that OOMs the
// single-node replicator. Value picked to keep total added latency well under
// a second while providing meaningful backpressure.
const REPLICATION_SLEEP_EVERY_ROWS = 10_000;
const REPLICATION_SLEEP_MS = 50;

type Database = typeof db;

interface TxnBatchEntry {
  fixture: DemoTxnSeed;
  row: typeof transaction.$inferInsert;
}

/**
 * Called after each batch insert so PlanetScale logical replication can drain
 * before the next batch. `setImmediate` yields the event loop; a short real
 * sleep every {@link REPLICATION_SLEEP_EVERY_ROWS} rows gives zero-cache room
 * to process WAL events it just received.
 */
async function paceReplication(rowsSinceLastSleep: number): Promise<number> {
  await yieldToEventLoop();
  if (rowsSinceLastSleep >= REPLICATION_SLEEP_EVERY_ROWS) {
    await sleep(REPLICATION_SLEEP_MS);
    return 0;
  }
  return rowsSinceLastSleep;
}

/** True if the user already has any transaction row — used for idempotency. */
export async function hasAnyDemoTransactions(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: transaction.id })
    .from(transaction)
    .where(eq(transaction.userId, userId))
    .limit(1);
  return rows.length > 0;
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

async function loadAccountIdByKey(
  database: Database,
  userId: string,
): Promise<Map<string, string>> {
  const rows = await database
    .select({
      id: financialAccount.id,
      institutionName: financialAccount.institutionName,
      mask: financialAccount.mask,
      name: financialAccount.name,
    })
    .from(financialAccount)
    .where(eq(financialAccount.userId, userId));
  const map = new Map<string, string>();
  for (const acct of DEMO_ACCOUNTS) {
    const match = rows.find(
      (r) =>
        r.name === acct.name && r.mask === acct.mask && r.institutionName === acct.institutionName,
    );
    if (match) {
      map.set(acct.key, match.id);
    }
  }
  return map;
}

async function loadTagIdByKey(database: Database, userId: string): Promise<Map<string, string>> {
  const rows = await database
    .select({ id: tag.id, name: tag.name })
    .from(tag)
    .where(eq(tag.userId, userId));
  const byName = new Map(rows.map((r) => [r.name.toLowerCase(), r.id]));
  const byKey = new Map<string, string>();
  for (const t of DEMO_TAGS) {
    const id = byName.get(t.name.toLowerCase());
    if (id) {
      byKey.set(t.key, id);
    }
  }
  return byKey;
}

// ── Phase: accounts + balances ──────────────────────────────────────

export async function seedDemoAccountsAndBalances(userId: string): Promise<void> {
  const database = db;
  const existing = await database
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(eq(financialAccount.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    return;
  }

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

  const now = new Date();
  const balanceRows = DEMO_ACCOUNTS.map((acct, idx) => {
    const id = accountRows[idx]?.id;
    if (!id) {
      throw new Error(`demo seed: insert account ${acct.key} failed`);
    }
    return {
      accountId: id,
      creditLimit: acct.creditLimit,
      currency: "USD",
      current: acct.balance,
      lastSyncAt: now,
      userId,
    };
  });
  await database.insert(balance).values(balanceRows);
}

// ── Phase: tags ─────────────────────────────────────────────────────

export async function seedDemoTags(userId: string): Promise<void> {
  if (DEMO_TAGS.length === 0) {
    return;
  }
  const database = db;
  const existing = await database
    .select({ id: tag.id })
    .from(tag)
    .where(eq(tag.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    return;
  }
  await database
    .insert(tag)
    .values(DEMO_TAGS.map((t) => ({ color: t.color, name: t.name, userId })));
}

// ── Phase: transactions + transaction_tag links ─────────────────────

function buildTxnRow(
  tx: DemoTxnSeed,
  userId: string,
  now: Date,
  accountIdByKey: Map<string, string>,
  catBySystemKey: Map<string, string>,
  uncategorizedId: string,
): typeof transaction.$inferInsert {
  const accountId = accountIdByKey.get(tx.accountKey);
  if (!accountId) {
    throw new Error(`demo seed: txn references unknown accountKey ${tx.accountKey}`);
  }
  const website = websiteForGeneratedMerchant(tx.merchantName);
  return {
    accountId,
    address: tx.address,
    amount: tx.amount,
    categoryId: catBySystemKey.get(tx.categoryKey) ?? uncategorizedId,
    city: tx.city,
    country: tx.country,
    currency: "USD",
    date: demoTxnDate(now, tx.daysAgo),
    lat: tx.lat,
    logoUrl: website,
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
  };
}

async function flushTransactionBatch(
  database: Database,
  batch: TxnBatchEntry[],
  tagIdByKey: Map<string, string>,
): Promise<void> {
  const inserted = await database
    .insert(transaction)
    .values(batch.map((entry) => entry.row))
    .returning({ id: transaction.id });
  const tagLinks = inserted.flatMap((row, idx) => {
    const fixture = batch[idx]?.fixture;
    if (!fixture) {
      return [];
    }
    return (fixture.tagKeys ?? []).flatMap((key) => {
      const tagId = tagIdByKey.get(key);
      return tagId ? [{ tagId, transactionId: row.id }] : [];
    });
  });
  if (tagLinks.length > 0) {
    await database.insert(transactionTag).values(tagLinks);
  }
}

export async function seedDemoTransactions(userId: string): Promise<{ inserted: number }> {
  const database = db;
  const now = new Date();
  const { byKey: catBySystemKey, uncategorizedId } = await loadUserCategories(database, userId);
  const accountIdByKey = await loadAccountIdByKey(database, userId);
  const tagIdByKey = await loadTagIdByKey(database, userId);

  let rowsSinceSleep = 0;
  let total = 0;
  const batch: TxnBatchEntry[] = [];

  for (const tx of iterateDemoTransactions()) {
    batch.push({
      fixture: tx,
      row: buildTxnRow(tx, userId, now, accountIdByKey, catBySystemKey, uncategorizedId),
    });
    if (batch.length >= DEMO_INSERT_BATCH_SIZE) {
      await flushTransactionBatch(database, batch, tagIdByKey);
      total += batch.length;
      rowsSinceSleep += batch.length;
      rowsSinceSleep = await paceReplication(rowsSinceSleep);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await flushTransactionBatch(database, batch, tagIdByKey);
    total += batch.length;
  }
  return { inserted: total };
}

// ── Phase: holdings ─────────────────────────────────────────────────

/**
 * Resolve every fixture ticker's `security.id` in at most two batched
 * round-trips: one SELECT for tickers already shared in the global security
 * table, one INSERT for the rest. Returns ticker → id map.
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

export async function seedDemoHoldings(userId: string): Promise<void> {
  const database = db;
  const existing = await database
    .select({ id: holding.id })
    .from(holding)
    .where(eq(holding.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const now = new Date();
  const asOf = now.toISOString().slice(0, 10);
  const accountIdByKey = await loadAccountIdByKey(database, userId);
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

// ── Phase: snapshots ────────────────────────────────────────────────

export async function seedDemoSnapshots(userId: string): Promise<{ inserted: number }> {
  const database = db;
  const existing = await database
    .select({ id: snapshot.id })
    .from(snapshot)
    .where(eq(snapshot.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    return { inserted: 0 };
  }

  const now = new Date();
  const accountIdByKey = await loadAccountIdByKey(database, userId);
  let rowsSinceSleep = 0;
  let total = 0;
  const batch: (typeof snapshot.$inferInsert)[] = [];

  for (const snap of iterateDemoSnapshots()) {
    const accountId = accountIdByKey.get(snap.accountKey);
    if (!accountId) {
      continue;
    }
    batch.push({
      accountId,
      creditLimit: snap.creditLimit,
      currency: "USD",
      current: snap.current,
      snapshotDate: demoTxnDate(now, snap.daysAgo),
      source: "manual",
      userId,
    });

    if (batch.length >= DEMO_INSERT_BATCH_SIZE) {
      await database.insert(snapshot).values(batch);
      total += batch.length;
      rowsSinceSleep += batch.length;
      rowsSinceSleep = await paceReplication(rowsSinceSleep);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await database.insert(snapshot).values(batch);
    total += batch.length;
  }
  return { inserted: total };
}

// ── Phase: investment activities ────────────────────────────────────

export async function seedDemoInvestmentActivities(userId: string): Promise<void> {
  if (DEMO_INVESTMENT_ACTIVITY.length === 0) {
    return;
  }
  const database = db;
  const existing = await database
    .select({ id: investmentActivity.id })
    .from(investmentActivity)
    .where(eq(investmentActivity.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const now = new Date();
  const accountIdByKey = await loadAccountIdByKey(database, userId);

  const tickers = [
    ...new Set(DEMO_INVESTMENT_ACTIVITY.map((a) => a.ticker).filter(Boolean)),
  ] as string[];
  const securityIdByTicker = new Map<string, string>();
  if (tickers.length > 0) {
    // Filter by ticker inArray (matches resolveSecurityIdsByTicker). Previously
    // this loaded the entire `security` table — brutal on PlanetScale + WAL.
    const rows = await database
      .select({ id: security.id, ticker: security.tickerSymbol })
      .from(security)
      .where(and(eq(security.type, "equity"), inArray(security.tickerSymbol, tickers)));
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

// ── Phase: chat threads + messages + parts ──────────────────────────

async function flushChatMessageBatch(
  database: Database,
  messageRows: (typeof messages.$inferInsert)[],
  partRows: (typeof parts.$inferInsert)[],
): Promise<void> {
  if (messageRows.length > 0) {
    await database.insert(messages).values(messageRows);
  }
  if (partRows.length > 0) {
    await database.insert(parts).values(partRows);
  }
}

export async function seedDemoChatThreads(userId: string): Promise<{ inserted: number }> {
  const database = db;
  const existing = await database
    .select({ chatId: chats.chatId })
    .from(chats)
    .where(eq(chats.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    return { inserted: 0 };
  }

  const now = new Date();
  const chatFixtures = generateDemoChats();
  const chatRows: (typeof chats.$inferInsert)[] = chatFixtures.map((chatFixture) => {
    const chatId = crypto.randomUUID();
    const chatCreatedAt = new Date(now.getTime() - chatFixture.daysAgo * MS_PER_DAY);
    return {
      chatId,
      createdAt: chatCreatedAt,
      title: chatFixture.title,
      updatedAt: chatCreatedAt,
      userId,
    };
  });

  if (chatRows.length > 0) {
    await database.insert(chats).values(chatRows);
  }

  let rowsSinceSleep = 0;
  let total = 0;
  let messageBatch: (typeof messages.$inferInsert)[] = [];
  let partBatch: (typeof parts.$inferInsert)[] = [];

  for (const [chatIdx, chatFixture] of chatFixtures.entries()) {
    const chatId = chatRows[chatIdx]?.chatId;
    if (!chatId) {
      continue;
    }

    for (const msg of chatFixture.messages) {
      const messageId = crypto.randomUUID();
      const createdAt = new Date(now.getTime() - msg.minutesAgo * 60_000);
      messageBatch.push({ chatId, createdAt, messageId, role: msg.role });
      partBatch.push({
        createdAt,
        messageId,
        order: 0,
        partId: crypto.randomUUID(),
        text_text: msg.text,
        type: "text",
      });

      if (messageBatch.length >= DEMO_INSERT_BATCH_SIZE) {
        await flushChatMessageBatch(database, messageBatch, partBatch);
        total += messageBatch.length;
        rowsSinceSleep += messageBatch.length;
        rowsSinceSleep = await paceReplication(rowsSinceSleep);
        messageBatch = [];
        partBatch = [];
      }
    }
  }

  if (messageBatch.length > 0) {
    await flushChatMessageBatch(database, messageBatch, partBatch);
    total += messageBatch.length;
  }
  return { inserted: total };
}

/**
 * Seed all demo rows for a freshly-created demo user. Runs each phase
 * **serially** so PlanetScale's logical replication doesn't see a single
 * multi-phase burst that OOMs single-node zero-cache. In the workflow path
 * (apps/server/src/workflows/demo-seed), each phase is invoked as a separate
 * step so progress can be streamed and retried independently. This wrapper is
 * kept for dev seed scripts + tests.
 */
export async function seedDemoUser(userId: string): Promise<void> {
  if (await hasAnyDemoTransactions(userId)) {
    return;
  }
  await seedDemoAccountsAndBalances(userId);
  await seedDemoTags(userId);
  await seedDemoTransactions(userId);
  await seedDemoHoldings(userId);
  await seedDemoSnapshots(userId);
  await seedDemoInvestmentActivities(userId);
  await seedDemoChatThreads(userId);
}
