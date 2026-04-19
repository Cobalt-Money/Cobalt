import type { transaction as transactionTable } from "@cobalt-web/db/schema/banking";
import type { InferInsertModel } from "drizzle-orm";
import type { Transaction } from "plaid";

export type TransactionInsert = InferInsertModel<typeof transactionTable>;

function transactionToRecordCore(tx: Transaction) {
  return {
    accountOwner: tx.account_owner || null,
    amount: tx.amount,
    authorizedDate: tx.authorized_date || null,
    authorizedDatetime: tx.authorized_datetime || null,
    category: tx.category || null,
    categoryId: tx.category_id || null,
    checkNumber: tx.check_number || null,
    counterparties: tx.counterparties || null,
    date: tx.date,
    datetime: tx.datetime || null,
    isoCurrencyCode: tx.iso_currency_code || null,
    location: tx.location || null,
    plaidAccountId: tx.account_id,
    plaidTransactionId: tx.transaction_id,
  };
}

function transactionToRecordMeta(tx: Transaction) {
  return {
    logoUrl: tx.logo_url || null,
    merchantEntityId: tx.merchant_entity_id || null,
    merchantName: tx.merchant_name || null,
    name: tx.name || "",
    originalDescription: tx.original_description || null,
    paymentChannel: tx.payment_channel || null,
    paymentMeta: tx.payment_meta || null,
    pending: tx.pending,
    pendingTransactionId: tx.pending_transaction_id || null,
    personalFinanceCategory: tx.personal_finance_category || null,
    personalFinanceCategoryIconUrl:
      tx.personal_finance_category_icon_url || null,
    transactionCode: tx.transaction_code || null,
    transactionType: tx.transaction_type || null,
    unofficialCurrencyCode: tx.unofficial_currency_code || null,
    website: tx.website || null,
  };
}

export function transactionToRecord(tx: Transaction): TransactionInsert {
  return {
    ...transactionToRecordCore(tx),
    ...transactionToRecordMeta(tx),
  } as TransactionInsert;
}
