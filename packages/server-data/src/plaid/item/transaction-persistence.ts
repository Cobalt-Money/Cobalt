import { db } from "@cobalt-web/db";
import { transaction as transactionTable } from "@cobalt-web/db/schema/banking";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import type { Transaction } from "plaid";

export interface UserOverrides {
  userOverrideName: string | null;
  userOverrideCategory: { primary: string; detailed: string } | null;
}

const orNull = <T>(value: T | undefined | null | ""): T | null => value || null;

function mapNullableFields(
  transaction: Transaction
): Pick<
  typeof transactionTable.$inferInsert,
  | "accountOwner"
  | "authorizedDate"
  | "authorizedDatetime"
  | "category"
  | "categoryId"
  | "checkNumber"
  | "datetime"
  | "isoCurrencyCode"
  | "logoUrl"
  | "merchantEntityId"
  | "merchantName"
  | "originalDescription"
  | "paymentChannel"
  | "pendingTransactionId"
  | "personalFinanceCategoryIconUrl"
  | "transactionCode"
  | "transactionType"
  | "unofficialCurrencyCode"
  | "website"
> {
  return {
    accountOwner: orNull(transaction.account_owner),
    authorizedDate: orNull(transaction.authorized_date),
    authorizedDatetime: orNull(transaction.authorized_datetime),
    category: orNull(transaction.category),
    categoryId: orNull(transaction.category_id),
    checkNumber: orNull(transaction.check_number),
    datetime: orNull(transaction.datetime),
    isoCurrencyCode: orNull(transaction.iso_currency_code),
    logoUrl: orNull(transaction.logo_url),
    merchantEntityId: orNull(transaction.merchant_entity_id),
    merchantName: orNull(transaction.merchant_name),
    originalDescription: orNull(transaction.original_description),
    paymentChannel: orNull(transaction.payment_channel),
    pendingTransactionId: orNull(transaction.pending_transaction_id),
    personalFinanceCategoryIconUrl: orNull(
      transaction.personal_finance_category_icon_url
    ),
    transactionCode: orNull(transaction.transaction_code),
    transactionType: orNull(transaction.transaction_type),
    unofficialCurrencyCode: orNull(transaction.unofficial_currency_code),
    website: orNull(transaction.website),
  };
}

function transactionToRecord(
  transaction: Transaction
): typeof transactionTable.$inferInsert {
  return {
    ...mapNullableFields(transaction),
    amount: transaction.amount,
    counterparties:
      transaction.counterparties as unknown as typeof transactionTable.$inferInsert.counterparties,
    date: transaction.date,
    location: transaction.location || null,
    name: transaction.name || "",
    paymentMeta: transaction.payment_meta || null,
    pending: transaction.pending,
    personalFinanceCategory:
      transaction.personal_finance_category as unknown as typeof transactionTable.$inferInsert.personalFinanceCategory,
    plaidAccountId: transaction.account_id,
    plaidTransactionId: transaction.transaction_id,
  };
}

export async function persistTransaction(
  transaction: Transaction
): Promise<void> {
  const record = transactionToRecord(transaction);
  await db
    .insert(transactionTable)
    .values(record)
    .onConflictDoUpdate({
      set: record,
      target: [transactionTable.plaidTransactionId],
    });
}

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

export async function getUserOverrides(
  transactionIds: string[]
): Promise<Map<string, UserOverrides>> {
  if (transactionIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      plaidTransactionId: transactionTable.plaidTransactionId,
      userOverrideCategory: transactionTable.userOverrideCategory,
      userOverrideName: transactionTable.userOverrideName,
    })
    .from(transactionTable)
    .where(
      and(
        inArray(transactionTable.plaidTransactionId, transactionIds),
        or(
          isNotNull(transactionTable.userOverrideName),
          isNotNull(transactionTable.userOverrideCategory)
        )
      )
    );

  return new Map(
    rows.map((row) => [
      row.plaidTransactionId,
      {
        userOverrideCategory:
          row.userOverrideCategory as UserOverrides["userOverrideCategory"],
        userOverrideName: row.userOverrideName,
      },
    ])
  );
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
    if (!posted.pendingTransactionId) {
      continue;
    }
    const override = overrides.get(posted.pendingTransactionId);
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
