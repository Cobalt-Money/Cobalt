import { db } from "@cobalt-web/db";
import { transaction } from "@cobalt-web/db/schema/banking";
import { eq } from "drizzle-orm";

export async function updateTransactionOverride(
  transactionId: string,
  field:
    | "notes"
    | "userOverrideCategory"
    | "userOverrideDate"
    | "userOverrideName",
  value: unknown
) {
  await db
    .update(transaction)
    .set({ [field]: value })
    .where(eq(transaction.id, transactionId));
}
