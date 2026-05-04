import type { transaction as transactionTable } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import type { InferInsertModel } from "drizzle-orm";
import type { Transaction } from "plaid";

export type TransactionInsert = InferInsertModel<typeof transactionTable>;

function flattenLocation(loc: Transaction["location"] | undefined) {
  return {
    address: loc?.address ?? null,
    city: loc?.city ?? null,
    country: loc?.country ?? null,
    lat: loc?.lat ?? null,
    lon: loc?.lon ?? null,
    postalCode: loc?.postal_code ?? null,
    region: loc?.region ?? null,
    storeNumber: loc?.store_number ?? null,
  };
}

function transactionToRecordCore(tx: Transaction) {
  return {
    accountOwner: tx.account_owner || null,
    amount: String(tx.amount),
    authorizedDate: tx.authorized_date || null,
    checkNumber: tx.check_number || null,
    counterparties: tx.counterparties || null,
    currency: tx.iso_currency_code || null,
    date: tx.date,
    ...flattenLocation(tx.location),
  };
}

function transactionToRecordMeta(tx: Transaction) {
  return {
    logoUrl: tx.logo_url || null,
    merchantEntityId: tx.merchant_entity_id || null,
    merchantName: tx.merchant_name || null,
    name: tx.name || "",
    paymentChannel: tx.payment_channel || null,
    pending: tx.pending,
    pendingTransactionId: tx.pending_transaction_id || null,
    transactionCode: tx.transaction_code || null,
    website: tx.website || null,
  };
}

/**
 * Map a Plaid Transaction → new `transaction` row.
 * Caller resolves `accountId`, `userId` (via lookupFinancialAccountsByPlaidIds)
 * and `categoryId` (via PFC → systemKey → lookupCategoryIdsBySystemKey) before
 * calling.
 */
export function transactionToRecord(
  tx: Transaction,
  accountId: string,
  userId: string,
  categoryId: string,
): TransactionInsert {
  return {
    accountId,
    categoryId,
    externalId: tx.transaction_id,
    source: "plaid" as const,
    userId,
    ...transactionToRecordCore(tx),
    ...transactionToRecordMeta(tx),
  } as TransactionInsert;
}
