import {
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { transaction } from "../transactions/transaction";
import { tag } from "./tag";

export const transactionTag = pgTable(
  "transaction_tag",
  {
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.transactionId, t.tagId] }),
    index("transaction_tag_tag_id_idx").on(t.tagId),
  ]
);

export type TransactionTag = typeof transactionTag.$inferSelect;
export type TransactionTagInsert = typeof transactionTag.$inferInsert;
