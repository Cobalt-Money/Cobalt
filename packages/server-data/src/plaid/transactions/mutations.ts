import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/banking";
import { eq, inArray, sql } from "drizzle-orm";
import type { Transaction } from "plaid";

import { transactionToRecord } from "./lib.js";
import type { UserOverrides } from "./queries.js";

export async function persistTransactions(
  transactions: Transaction[]
): Promise<void> {
  if (transactions.length === 0) {
    return;
  }

  const records = transactions.map(transactionToRecord);

  await db
    .insert(transactionTable)
    .values(records)
    .onConflictDoUpdate({
      set: {
        accountOwner: sql`excluded.account_owner`,
        amount: sql`excluded.amount`,
        authorizedDate: sql`excluded.authorized_date`,
        authorizedDatetime: sql`excluded.authorized_datetime`,
        category: sql`excluded.category`,
        categoryId: sql`excluded.category_id`,
        checkNumber: sql`excluded.check_number`,
        counterparties: sql`excluded.counterparties`,
        date: sql`excluded.date`,
        datetime: sql`excluded.datetime`,
        isoCurrencyCode: sql`excluded.iso_currency_code`,
        location: sql`excluded.location`,
        logoUrl: sql`excluded.logo_url`,
        merchantEntityId: sql`excluded.merchant_entity_id`,
        merchantName: sql`excluded.merchant_name`,
        name: sql`excluded.name`,
        originalDescription: sql`excluded.original_description`,
        paymentChannel: sql`excluded.payment_channel`,
        paymentMeta: sql`excluded.payment_meta`,
        pending: sql`excluded.pending`,
        pendingTransactionId: sql`excluded.pending_transaction_id`,
        personalFinanceCategory: sql`excluded.personal_finance_category`,
        personalFinanceCategoryIconUrl: sql`excluded.personal_finance_category_icon_url`,
        plaidAccountId: sql`excluded.plaid_account_id`,
        transactionCode: sql`excluded.transaction_code`,
        transactionType: sql`excluded.transaction_type`,
        unofficialCurrencyCode: sql`excluded.unofficial_currency_code`,
        updatedAt: sql`now()`,
        website: sql`excluded.website`,
      },
      target: [transactionTable.plaidTransactionId],
    });
}

export async function removeTransactionsByIds(
  transactionIds: string[]
): Promise<void> {
  if (transactionIds.length === 0) {
    return;
  }
  await db
    .delete(transactionTable)
    .where(inArray(transactionTable.plaidTransactionId, transactionIds));
}

export async function applyPendingOverrides(
  overrides: Map<string, UserOverrides>
): Promise<number> {
  if (overrides.size === 0) {
    return 0;
  }

  const pendingIds = [...overrides.keys()];

  const postedTxs = await db
    .select({
      pendingTransactionId: transactionTable.pendingTransactionId,
      plaidTransactionId: transactionTable.plaidTransactionId,
    })
    .from(transactionTable)
    .where(inArray(transactionTable.pendingTransactionId, pendingIds));

  let applied = 0;
  for (const posted of postedTxs) {
    const override = overrides.get(posted.pendingTransactionId ?? "");
    if (!override) {
      continue;
    }

    await db
      .update(transactionTable)
      .set({
        updatedAt: new Date(),
        userOverrideCategory: override.userOverrideCategory,
        userOverrideName: override.userOverrideName,
      })
      .where(
        eq(transactionTable.plaidTransactionId, posted.plaidTransactionId)
      );

    applied += 1;
  }

  return applied;
}
