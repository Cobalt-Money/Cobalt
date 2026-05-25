import { db } from "@cobalt-web/db";
import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import { transactionTag } from "@cobalt-web/db/schema/accounts/banking/tags/transaction-tag";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";
import { and, eq, inArray } from "drizzle-orm";

import { ApiError } from "../_shared/errors.js";
import type { TransactionResponse } from "./schema.js";

/** Shared join chain + flat picked columns. Callers add `.where` + `.orderBy` + `.limit`. */
export function selectTransactionRows() {
  return db
    .select({
      accountId: transaction.accountId,
      accountInstitutionName: financialAccount.institutionName,
      accountLogoDomain: financialAccount.logoDomain,
      accountName: financialAccount.name,
      accountSubtype: financialAccount.subtype,
      accountType: financialAccount.type,
      address: transaction.address,
      amount: transaction.amount,
      authorizedDate: transaction.authorizedDate,
      categoryGroupName: categoryGroup.name,
      categoryGroupSystemKey: categoryGroup.systemKey,
      categoryIconKey: category.iconKey,
      categoryId: transaction.categoryId,
      categoryName: category.name,
      categorySystemKey: category.systemKey,
      city: transaction.city,
      counterparties: transaction.counterparties,
      country: transaction.country,
      date: transaction.date,
      id: transaction.id,
      institutionLogo: institution.logo,
      institutionName: institution.name,
      institutionUrl: institution.url,
      lat: transaction.lat,
      lockedFields: transaction.lockedFields,
      logoUrl: transaction.logoUrl,
      lon: transaction.lon,
      merchantName: transaction.merchantName,
      name: transaction.name,
      notes: transaction.notes,
      pending: transaction.pending,
      plaidAccountId: financialAccount.externalId,
      postalCode: transaction.postalCode,
      region: transaction.region,
      source: transaction.source,
      storeNumber: transaction.storeNumber,
      website: transaction.website,
    })
    .from(transaction)
    .innerJoin(financialAccount, eq(transaction.accountId, financialAccount.id))
    .leftJoin(category, eq(transaction.categoryId, category.id))
    .leftJoin(categoryGroup, eq(category.groupId, categoryGroup.id))
    .leftJoin(plaidConnection, eq(financialAccount.plaidConnectionId, plaidConnection.id))
    .leftJoin(institution, eq(institution.plaidInstitutionId, plaidConnection.institutionId));
}

/** Flat joined row + tag ids → public DTO. */
export function toTransactionDto(
  row: Awaited<ReturnType<typeof selectTransactionRows>>[number],
  tagIds: readonly string[],
): TransactionResponse {
  const hasLocation =
    row.address ||
    row.city ||
    row.region ||
    row.postalCode ||
    row.country ||
    row.storeNumber ||
    row.lat !== null ||
    row.lon !== null;
  return {
    accountId: row.accountId,
    accountLogoDomain: row.accountLogoDomain,
    accountName: row.accountName,
    accountSubtype: row.accountSubtype,
    accountType: row.accountType,
    amount: Number(row.amount),
    authorizedDate: row.authorizedDate,
    category: row.categoryId
      ? {
          groupName: row.categoryGroupName ?? "",
          groupSystemKey: row.categoryGroupSystemKey,
          iconKey: row.categoryIconKey ?? "",
          id: row.categoryId,
          name: row.categoryName ?? "",
          systemKey: row.categorySystemKey,
        }
      : null,
    counterparties: row.counterparties,
    date: row.date,
    id: row.id,
    institutionLogo: row.institutionLogo,
    institutionName: row.institutionName ?? row.accountInstitutionName,
    institutionUrl: row.institutionUrl,
    location: hasLocation
      ? {
          address: row.address,
          city: row.city,
          country: row.country,
          lat: row.lat,
          lon: row.lon,
          postal_code: row.postalCode,
          region: row.region,
          store_number: row.storeNumber,
        }
      : null,
    lockedFields: (row.lockedFields ?? []) as TransactionResponse["lockedFields"],
    logoUrl: row.logoUrl,
    merchantName: row.merchantName,
    name: row.name,
    notes: row.notes,
    pending: row.pending,
    plaidAccountId: row.plaidAccountId,
    source: row.source,
    tagIds: [...tagIds],
    website: row.website,
  };
}

export async function fetchTagsByTransaction(
  txIds: readonly string[],
): Promise<Map<string, string[]>> {
  if (txIds.length === 0) {
    return new Map();
  }
  const tagRows = await db
    .select({
      tagId: transactionTag.tagId,
      transactionId: transactionTag.transactionId,
    })
    .from(transactionTag)
    .where(inArray(transactionTag.transactionId, txIds));
  const tagsByTx = new Map<string, string[]>();
  for (const t of tagRows) {
    const arr = tagsByTx.get(t.transactionId);
    if (arr) {
      arr.push(t.tagId);
    } else {
      tagsByTx.set(t.transactionId, [t.tagId]);
    }
  }
  return tagsByTx;
}

export async function getTransactionDetail(
  userId: string,
  transactionId: string,
): Promise<TransactionResponse> {
  const [row] = await selectTransactionRows()
    .where(and(eq(transaction.id, transactionId), eq(transaction.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "transaction_not_found", "Transaction not found");
  }

  const tagsByTx = await fetchTagsByTransaction([row.id]);
  return toTransactionDto(row, tagsByTx.get(row.id) ?? []);
}
