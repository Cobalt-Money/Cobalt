import {
  bigint,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { transaction } from "../accounts/banking/transactions/transaction";
import { user } from "../users/auth/auth";

/**
 * Shared transaction projection — the ONLY surface the friends app reads from
 * for txn-derived map content. Denormalized at share time so the `transactions`
 * table never needs to be exposed to non-owners. Hard security boundary:
 * if it isn't in `social_post`, it can't leak to friends.
 *
 * Amount is stored in cents (avoid float drift). Friends app divides by 100
 * for display.
 *
 * One post per (user, transaction) — sharing a txn twice is idempotent.
 * Unshare = hard-delete the post row.
 */
export const socialPost = pgTable(
  "social_post",
  {
    /** Optional vibe bucket: '$' | '$$' | '$$$'. */
    amountBucket: text("amount_bucket"),
    /** Rounded cents. Nullable when sharing is bucket-only. */
    amountCents: bigint("amount_cents", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    date: timestamp("date").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    merchantName: text("merchant_name").notNull(),
    note: text("note"),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transaction.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("social_post_user_txn_uq").on(table.userId, table.transactionId),
    index("social_post_user_idx").on(table.userId),
    index("social_post_lat_lon_idx").on(table.lat, table.lon),
  ],
);
