import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

/** Alerts domain — `queries.alerts.*` (user-facing reconnect/new-account alerts). */
export const alertsQueries = {
  /**
   * Active alerts (unread + read) for the signed-in user, newest first.
   * Dismissed/resolved rows are filtered out; the partial unique index
   * `user_alerts_active_dedup_idx` also keeps duplicate webhooks from
   * spawning extra rows here.
   */
  active: defineQuery(({ ctx }: { ctx: Context }) => {
    const userId = ctx?.userId;
    if (!userId) {
      return zql.userAlerts.where("id", NO_MATCH_ID);
    }
    return zql.userAlerts
      .where("userId", userId)
      .where(({ cmp, or }) => or(cmp("status", "=", "unread"), cmp("status", "=", "read")))
      .orderBy("createdAt", "desc");
  }),
};
