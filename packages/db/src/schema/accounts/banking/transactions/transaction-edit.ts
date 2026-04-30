import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../../users/auth/auth";
import { transaction } from "./transaction";

export const transactionEditActor = pgEnum("transaction_edit_actor", [
  "system",
  "user",
]);

/**
 * Field name being edited. Stored as plain `text` (not enum) because the set of
 * editable fields evolves with the schema and pg enum migrations are painful
 * (`ALTER TYPE ... ADD VALUE` cannot run inside a transaction). Validation lives
 * in the Zod schema for `transactionActivityItemSchema`.
 */
export const TRANSACTION_EDIT_FIELDS = [
  "amount",
  "category",
  "date",
  "location",
  "merchantName",
  "name",
  "notes",
  "tags",
] as const;
export type TransactionEditFieldName = (typeof TRANSACTION_EDIT_FIELDS)[number];

export const transactionEdit = pgTable(
  "transaction_edit",
  {
    actor: transactionEditActor("actor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    field: text("field").$type<TransactionEditFieldName>().notNull(),
    id: uuid("id").primaryKey().defaultRandom(),
    /** Native value of the field, typed by `field`: name=string, notes=markdown string (historical rows may still hold Tiptap JSON), date=YYYY-MM-DD string, amount=number, category={primary,detailed,confidence?}. Null on first-ever edit if Plaid value unknown. */
    newValue: jsonb("new_value").$type<unknown>(),
    oldValue: jsonb("old_value").$type<unknown>(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("transaction_edit_transaction_id_idx").on(t.transactionId),
    index("transaction_edit_created_at_idx").on(t.createdAt),
  ]
);

export type TransactionEdit = typeof transactionEdit.$inferSelect;
export type TransactionEditInsert = typeof transactionEdit.$inferInsert;
