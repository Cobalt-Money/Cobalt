import { db } from "@cobalt-web/db";
import {
  bankAccount,
  bankBalance,
  bankConnection,
} from "@cobalt-web/db/schema/banking";
import {
  ALERT_SOURCES,
  ALERT_STATUSES,
  userAlerts,
} from "@cobalt-web/db/schema/features";
import { and, eq, inArray } from "drizzle-orm";
import type { AccountBase } from "plaid";

import { upsertInstitutionByPlaidId } from "../../institutions/mutations.js";
import { getInstitutionById } from "../institutions/actions.js";
import {
  bankAccountInsertFromPlaid,
  balanceRowFromPlaidAccount,
} from "./lib.js";

/**
 * Persist Plaid item metadata to bankConnection.
 */
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
  await db.insert(bankConnection).values({
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

/**
 * Onboarding persist: fetch institution details (best-effort), upsert the
 * `institution` row so the mapper has a URL for Brandfetch/Logo.dev, then
 * insert the bankConnection row.
 */
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

/**
 * Apply ITEM webhook state changes to bankConnection. Returns a result so the
 * caller can decide whether to emit telemetry for unhandled codes.
 */
export async function applyItemWebhookState(params: {
  webhookCode: string;
  plaidItemId: string;
  error?: unknown;
}): Promise<
  | { success: true; webhookCode: string }
  | { skipped: true; webhookCode: string }
> {
  const { webhookCode, plaidItemId } = params;

  switch (webhookCode) {
    case "NEW_ACCOUNTS_AVAILABLE": {
      await db
        .update(bankConnection)
        .set({ newAccountsAvailable: true, updatedAt: new Date() })
        .where(eq(bankConnection.plaidItemId, plaidItemId));
      return { success: true, webhookCode };
    }

    case "ERROR": {
      await db
        .update(bankConnection)
        .set({
          error: (params.error ??
            null) as (typeof bankConnection.$inferInsert)["error"],
          updatedAt: new Date(),
        })
        .where(eq(bankConnection.plaidItemId, plaidItemId));
      return { success: true, webhookCode };
    }

    case "PENDING_DISCONNECT": {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(bankConnection)
        .set({ pendingDisconnectAt: sevenDaysFromNow, updatedAt: new Date() })
        .where(eq(bankConnection.plaidItemId, plaidItemId));
      return { success: true, webhookCode };
    }

    case "LOGIN_REPAIRED": {
      await db
        .update(bankConnection)
        .set({ error: null, pendingDisconnectAt: null, updatedAt: new Date() })
        .where(eq(bankConnection.plaidItemId, plaidItemId));
      return { success: true, webhookCode };
    }

    default: {
      return { skipped: true, webhookCode };
    }
  }
}

/** Upsert balance for a single Plaid account. */
export async function upsertBalanceForPlaidAccount(
  account: AccountBase
): Promise<void> {
  const existing = await db.query.bankBalance.findFirst({
    where: { plaidAccountId: { eq: account.account_id } },
  });

  const balanceData = balanceRowFromPlaidAccount(account);

  await (existing
    ? db
        .update(bankBalance)
        .set({ ...balanceData, updatedAt: new Date() })
        .where(eq(bankBalance.plaidAccountId, account.account_id))
    : db.insert(bankBalance).values(balanceData));
}

/**
 * Sync new accounts for an item: upsert accounts + balances, clear flag.
 */
export async function syncNewAccountsForItem(
  plaidItemId: string,
  accounts: AccountBase[]
): Promise<void> {
  if (accounts.length > 0) {
    const toInsert = bankAccountInsertFromPlaid(plaidItemId);
    await db
      .insert(bankAccount)
      .values(accounts.map(toInsert))
      .onConflictDoNothing({ target: bankAccount.plaidAccountId });

    await Promise.all(accounts.map(upsertBalanceForPlaidAccount));
  }

  await db
    .update(bankConnection)
    .set({ newAccountsAvailable: false, updatedAt: new Date() })
    .where(eq(bankConnection.plaidItemId, plaidItemId));
}

/**
 * Clear error state after re-authentication and resolve active alerts.
 */
export async function clearItemError(
  plaidItemId: string,
  userId: string
): Promise<void> {
  const item = await db.query.bankConnection.findFirst({
    columns: { plaidItemId: true },
    where: {
      AND: [{ plaidItemId: { eq: plaidItemId } }, { userId: { eq: userId } }],
    },
  });

  if (!item) {
    throw new Error("Item not found or access denied");
  }

  await db
    .update(bankConnection)
    .set({
      error: null,
      pendingDisconnectAt: null,
      updatedAt: new Date(),
    })
    .where(eq(bankConnection.plaidItemId, plaidItemId));

  await db
    .update(userAlerts)
    .set({ resolvedAt: new Date(), status: ALERT_STATUSES.RESOLVED })
    .where(
      and(
        eq(userAlerts.source, ALERT_SOURCES.PLAID),
        eq(userAlerts.sourceId, plaidItemId),
        inArray(userAlerts.status, [ALERT_STATUSES.UNREAD, ALERT_STATUSES.READ])
      )
    );
}
