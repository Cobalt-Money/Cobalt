import { db } from "@cobalt-web/db";

import { ApiError } from "../_shared/errors.js";

export async function getTransactionActivity(userId: string, transactionId: string) {
  const owned = await db.query.transaction.findFirst({
    columns: { id: true },
    where: { id: { eq: transactionId }, userId: { eq: userId } },
  });
  if (!owned) {
    throw new ApiError(404, "transaction_not_found", "Transaction not found");
  }

  const rows = await db.query.transactionEdit.findMany({
    columns: {
      actor: true,
      createdAt: true,
      field: true,
      id: true,
      newValue: true,
      oldValue: true,
    },
    orderBy: { createdAt: "asc" },
    where: { transactionId: { eq: transactionId } },
  });

  return rows.map((r) => ({
    actor: r.actor,
    createdAt: r.createdAt.toISOString(),
    field: r.field,
    id: r.id,
    newValue: r.newValue,
    oldValue: r.oldValue,
  }));
}
