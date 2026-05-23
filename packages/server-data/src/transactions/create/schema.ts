import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { transactionNotesMarkdownSchema as notesMarkdownSchema } from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { z } from "@hono/zod-openapi";
import { createInsertSchema } from "drizzle-orm/zod";

import { locationJsonSchema } from "../_shared/schema.js";

const baseInsert = createInsertSchema(transaction, {
  amount: z.number(),
  currency: (s) => s.length(3),
  date: (s) => s.regex(/^\d{4}-\d{2}-\d{2}$/),
  merchantName: (s) => s.min(1).max(255),
  name: (s) => s.min(1).max(255),
  notes: notesMarkdownSchema.nullish(),
  website: (s) => s.min(1).max(2048),
});

/**
 * Body for `createManualTransactions`. Server stamps `source: "manual"`,
 * `pending: false`, `userId`, plus `lockedFields: ["location"]` whenever
 * `location` is provided. Insertion is only permitted onto user-owned manual
 * (non-Plaid) accounts.
 */
export const createTransactionSchema = baseInsert
  .pick({
    accountId: true,
    amount: true,
    categoryId: true,
    currency: true,
    date: true,
    id: true,
    merchantName: true,
    name: true,
    notes: true,
    website: true,
  })
  .extend({
    /** User-edited merchant location. Flattened to `lat`/`lon`/`address`/etc cols on insert. */
    location: locationJsonSchema.optional(),
  });

export type CreateTransaction = z.infer<typeof createTransactionSchema>;
