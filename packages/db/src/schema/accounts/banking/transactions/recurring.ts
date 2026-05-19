import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../../users/auth/auth";
import { financialAccount } from "../../account";
import { category } from "../categories/category";
import { transactionSource } from "./transaction";
import type { RecurringTransactionIdsJson } from "./zod";

export const recurring = pgTable(
  "recurring",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    averageAmount: numeric("average_amount", {
      precision: 19,
      scale: 4,
    }).notNull(),
    /** SRI-311: FK to user's category row. */
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    description: text("description").notNull(),
    externalId: text("external_id"),
    firstDate: date("first_date").notNull(),
    frequency: text("frequency").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    lastAmount: numeric("last_amount", { precision: 19, scale: 4 }).notNull(),
    lastDate: date("last_date").notNull(),
    merchantName: text("merchant_name"),
    predictedNextDate: date("predicted_next_date"),
    source: transactionSource("source").notNull(), //plaid or snaptrade
    status: text("status").notNull(),
    streamType: text("stream_type").notNull(), //what is this?
    transactionIds: jsonb("transaction_ids").$type<RecurringTransactionIdsJson>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("recurring_account_id_idx").on(t.accountId),
    index("recurring_category_id_idx").on(t.categoryId),
    index("recurring_user_id_idx").on(t.userId),
    index("recurring_account_date_type_idx").on(t.accountId, t.lastDate, t.streamType),
    uniqueIndex("recurring_source_external_id_idx")
      .on(t.source, t.externalId)
      .where(sql`external_id IS NOT NULL`),
  ],
);

export type Recurring = typeof recurring.$inferSelect;
export type RecurringInsert = typeof recurring.$inferInsert;
