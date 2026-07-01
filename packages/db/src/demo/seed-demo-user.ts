import { and, eq, inArray } from "drizzle-orm";

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

type Database = typeof db;

interface TxnBatchEntry {
  fixture: DemoTxnSeed;
  row: typeof transaction.$inferInsert;
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

async function seedTransactionsAndTags(
  database: Database,
  userId: string,
  now: Date,
  accountIdByKey: Map<string, string>,
  catBySystemKey: Map<string, string>,
  uncategorizedId: string,
  tagIdByKey: Map<string, string>,
): Promise<void> {
  const batch: TxnBatchEntry[] = [];

  for (const tx of iterateDemoTransactions()) {
    batch.push({
      fixture: tx,
      row: buildTxnRow(tx, userId, now, accountIdByKey, catBySystemKey, uncategorizedId),
    });
    if (batch.length >= DEMO_INSERT_BATCH_SIZE) {
      await flushTransactionBatch(database, batch, tagIdByKey);
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await flushTransactionBatch(database, batch, tagIdByKey);
  }
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
 * Weekly snapshots over {@link DEMO_SNAPSHOT_HISTORY_DAYS}, inserted in batches.
 */
async function seedSnapshots(
  database: Database,
  userId: string,
  now: Date,
  accountIdByKey: Map<string, string>,
) {
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
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await database.insert(snapshot).values(batch);
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

async function seedChatThreads(database: Database, userId: string, now: Date) {
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
        messageBatch = [];
        partBatch = [];
      }
    }
  }

  if (messageBatch.length > 0) {
    await flushChatMessageBatch(database, messageBatch, partBatch);
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

  const [accountIdByKey, tagIdByKey] = await Promise.all([
    seedAccountsAndBalances(database, userId),
    seedTags(database, userId),
  ]);

  await Promise.all([
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
}
