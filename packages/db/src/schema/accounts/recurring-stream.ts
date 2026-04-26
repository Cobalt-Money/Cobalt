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

import { user } from "../auth/auth";
import type {
  LegacyCategoryArrayJson,
  PersonalFinanceCategoryJson,
  RecurringTransactionIdsJson,
} from "../banking/transactions/zod";
import { transactionSource } from "./enums";
import { financialAccount } from "./financial-account";

export const recurringStream = pgTable(
  "recurring_stream",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
    averageAmount: numeric("average_amount", {
      precision: 19,
      scale: 4,
    }).notNull(),
    category: jsonb("category").$type<LegacyCategoryArrayJson>(),
    categoryId: text("category_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    description: text("description").notNull(),
    externalId: text("external_id"),
    firstDate: date("first_date").notNull(),
    frequency: text("frequency").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isActive: boolean("is_active").default(true).notNull(),
    isUserModified: boolean("is_user_modified").default(false).notNull(),
    lastAmount: numeric("last_amount", { precision: 19, scale: 4 }).notNull(),
    lastDate: date("last_date").notNull(),
    lastUserModifiedDatetime: timestamp("last_user_modified_datetime", {
      withTimezone: true,
    }),
    merchantName: text("merchant_name"),
    personalFinanceCategory: jsonb(
      "personal_finance_category"
    ).$type<PersonalFinanceCategoryJson | null>(),
    predictedNextDate: date("predicted_next_date"),
    source: transactionSource("source").notNull(),
    status: text("status").notNull(),
    streamType: text("stream_type").notNull(),
    transactionIds: jsonb("transaction_ids")
      .$type<RecurringTransactionIdsJson>()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    index("recurring_stream_account_id_idx").on(t.accountId),
    index("recurring_stream_user_id_idx").on(t.userId),
    index("recurring_stream_account_date_type_idx").on(
      t.accountId,
      t.lastDate,
      t.streamType
    ),
    uniqueIndex("recurring_stream_source_external_id_idx")
      .on(t.source, t.externalId)
      .where(sql`external_id IS NOT NULL`),
  ]
);

export type RecurringStream = typeof recurringStream.$inferSelect;
export type RecurringStreamInsert = typeof recurringStream.$inferInsert;
