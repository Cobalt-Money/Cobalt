import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { snapshot } from "@cobalt-web/db/schema/accounts/snapshot";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { ALERT_SOURCES, userAlerts } from "@cobalt-web/db/schema/users/alerts";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { AccountBase } from "plaid";

import { upsertInstitutionByPlaidId } from "../../../institutions/mutations.js";
import { getInstitutionById } from "../institutions/actions.js";
import { balanceRowFromPlaidAccount, financialAccountInsertFromPlaid } from "./lib.js";

/** Persist Plaid item metadata to plaid_connection. */
export async function persistItemMetadata(params: {
  accessToken: string;
  availableProducts: string[];
  billedProducts: string[];
  institutionId: string | null;
  institutionLogo: string | null;
  institutionName: string | null;
  itemId: string;
  userId: string;
  webhookUrl: string | null;
}): Promise<void> {
  await db.insert(plaidConnection).values({
    availableProducts: params.availableProducts,
    billedProducts: params.billedProducts,
    institutionId: params.institutionId,
    institutionLogo: params.institutionLogo,
    institutionName: params.institutionName,
    plaidAccessToken: params.accessToken,
    plaidItemId: params.itemId,
    userId: params.userId,
    webhookUrl: params.webhookUrl,
  });
}

export async function persistOnboardingItem(params: {
  accessToken: string;
  item: {
    available_products?: string[] | null;
    billed_products?: string[] | null;
    institution_id?: string | null;
    webhook?: string | null;
  };
  itemId: string;
  userId: string;
}): Promise<void> {
  const institutionId = params.item.institution_id ?? null;
  let institutionName: string | null = null;

  if (institutionId) {
    const details = await getInstitutionById(institutionId);
    institutionName = details.name;
    await upsertInstitutionByPlaidId({
      logo: details.logo,
      name: details.name,
      oauth: details.oauth,
      plaidInstitutionId: details.id,
      primaryColor: details.primary_color,
      routingNumbers: details.routing_numbers,
      status: details.status ? String(details.status) : null,
      url: details.url,
    });
  }

  await persistItemMetadata({
    accessToken: params.accessToken,
    availableProducts: (params.item.available_products ?? []) as string[],
    billedProducts: (params.item.billed_products ?? []) as string[],
    institutionId,
    institutionLogo: null,
    institutionName,
    itemId: params.itemId,
    userId: params.userId,
    webhookUrl: params.item.webhook ?? null,
  });
}

export async function applyItemWebhookState(params: {
  webhookCode: string;
  plaidItemId: string;
  error?: unknown;
}): Promise<{ success: true; webhookCode: string } | { skipped: true; webhookCode: string }> {
  const { webhookCode, plaidItemId } = params;

  switch (webhookCode) {
    case "NEW_ACCOUNTS_AVAILABLE": {
      await db
        .update(plaidConnection)
        .set({ newAccountsAvailable: true, updatedAt: new Date() })
        .where(eq(plaidConnection.plaidItemId, plaidItemId));
      return { success: true, webhookCode };
    }

    case "ERROR": {
      await db
        .update(plaidConnection)
        .set({
          error: (params.error ?? null) as (typeof plaidConnection.$inferInsert)["error"],
          updatedAt: new Date(),
        })
        .where(eq(plaidConnection.plaidItemId, plaidItemId));
      return { success: true, webhookCode };
    }

    case "PENDING_DISCONNECT": {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(plaidConnection)
        .set({ pendingDisconnectAt: sevenDaysFromNow, updatedAt: new Date() })
        .where(eq(plaidConnection.plaidItemId, plaidItemId));
      return { success: true, webhookCode };
    }

    case "LOGIN_REPAIRED": {
      await db
        .update(plaidConnection)
        .set({ error: null, pendingDisconnectAt: null, updatedAt: new Date() })
        .where(eq(plaidConnection.plaidItemId, plaidItemId));
      return { success: true, webhookCode };
    }

    default: {
      return { skipped: true, webhookCode };
    }
  }
}

/** Upsert balance for a single Plaid account. Resolves financial_account.id. */
export async function upsertBalanceForPlaidAccount(account: AccountBase): Promise<void> {
  const accountRow = await db.query.financialAccount.findFirst({
    columns: { id: true, userId: true },
    where: {
      externalId: { eq: account.account_id },
      source: { eq: "plaid" },
    },
  });

  if (!accountRow) {
    return;
  }
  const balanceData = balanceRowFromPlaidAccount(account, accountRow.id, accountRow.userId);

  await db
    .insert(balance)
    .values(balanceData)
    .onConflictDoUpdate({
      set: {
        available: balanceData.available,
        creditLimit: balanceData.creditLimit,
        currency: balanceData.currency,
        current: balanceData.current,
        updatedAt: new Date(),
      },
      target: balance.accountId,
    });
}

export async function syncNewAccountsForItem(
  plaidItemId: string,
  accounts: AccountBase[],
): Promise<void> {
  if (accounts.length > 0) {
    const conn = await db.query.plaidConnection.findFirst({
      columns: { id: true, userId: true },
      where: { plaidItemId: { eq: plaidItemId } },
    });

    if (!conn) {
      throw new Error(`plaid_connection not found for item ${plaidItemId}`);
    }

    const { id: connId, userId } = conn;
    const toInsert = financialAccountInsertFromPlaid(connId, userId);
    await db
      .insert(financialAccount)
      .values(accounts.map(toInsert))
      .onConflictDoNothing({
        target: [financialAccount.source, financialAccount.externalId],
        where: sql`external_id IS NOT NULL`,
      });

    await Promise.all(accounts.map(upsertBalanceForPlaidAccount));
  }

  await db
    .update(plaidConnection)
    .set({ newAccountsAvailable: false, updatedAt: new Date() })
    .where(eq(plaidConnection.plaidItemId, plaidItemId));
}

/**
 * Upsert a single Plaid account onto `financial_account`. Conflicts on
 * `(source, external_id)` and preserves `persistentAccountId` if already set
 * (coalesce-style — Plaid may omit it on partial updates).
 */
export async function upsertPlaidAccount(
  connectionId: string,
  userId: string,
  account: AccountBase,
): Promise<void> {
  const toInsert = financialAccountInsertFromPlaid(connectionId, userId);
  await db
    .insert(financialAccount)
    .values(toInsert(account))
    .onConflictDoUpdate({
      set: {
        persistentAccountId: sql`coalesce(${financialAccount.persistentAccountId}, excluded.persistent_account_id)`,
        updatedAt: new Date(),
      },
      target: [financialAccount.source, financialAccount.externalId],
      targetWhere: sql`external_id IS NOT NULL`,
    });
}

/** Delete a Plaid financial_account row by primary key. */
export async function deletePlaidAccount(accountId: string): Promise<void> {
  await db.delete(financialAccount).where(eq(financialAccount.id, accountId));
}

/**
 * Re-point snapshot rows from an orphan financial_account to a new one,
 * skipping any (account, date) pair that already exists on the new account
 * (the unique index would reject the row anyway).
 */
export async function migrateSnapshotsBetweenAccounts(
  orphanId: string,
  newId: string,
  userId: string,
): Promise<void> {
  const orphanRows = await db
    .select({ snapshotDate: snapshot.snapshotDate })
    .from(snapshot)
    .where(and(eq(snapshot.userId, userId), eq(snapshot.accountId, orphanId)));

  const newRows = await db
    .select({ snapshotDate: snapshot.snapshotDate })
    .from(snapshot)
    .where(and(eq(snapshot.userId, userId), eq(snapshot.accountId, newId)));
  const newDates = new Set(newRows.map((r) => r.snapshotDate));

  for (const row of orphanRows) {
    const date = row.snapshotDate;
    await (newDates.has(date)
      ? db
          .delete(snapshot)
          .where(
            and(
              eq(snapshot.userId, userId),
              eq(snapshot.accountId, orphanId),
              eq(snapshot.snapshotDate, date),
            ),
          )
      : db
          .update(snapshot)
          .set({ accountId: newId })
          .where(
            and(
              eq(snapshot.userId, userId),
              eq(snapshot.accountId, orphanId),
              eq(snapshot.snapshotDate, date),
            ),
          ));
  }
}

export async function clearItemError(plaidItemId: string, userId: string): Promise<void> {
  const item = await db.query.plaidConnection.findFirst({
    columns: { plaidItemId: true },
    where: {
      plaidItemId: { eq: plaidItemId },
      userId: { eq: userId },
    },
  });

  if (!item) {
    throw new Error("Item not found or access denied");
  }

  await db
    .update(plaidConnection)
    .set({
      error: null,
      pendingDisconnectAt: null,
      updatedAt: new Date(),
    })
    .where(eq(plaidConnection.plaidItemId, plaidItemId));

  await db
    .update(userAlerts)
    .set({ resolvedAt: new Date() })
    .where(
      and(
        eq(userAlerts.source, ALERT_SOURCES.PLAID),
        eq(userAlerts.sourceId, plaidItemId),
        isNull(userAlerts.resolvedAt),
      ),
    );
}
