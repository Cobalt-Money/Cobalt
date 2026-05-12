import { defineQuery } from "@rocicorp/zero";

import type { Context } from "../auth.js";
import { zql } from "../schema.js";
import { NO_MATCH_ID } from "../transactions/lib.js";

/** Alerts domain — `queries.alerts.*` (user-facing reconnect/new-account alerts). */
export const alertsQueries = {
  /**
   * Active alerts for the signed-in user, newest first. An alert is active
   * until `resolvedAt` is set; the partial unique index
   * `user_alerts_dedup_idx` keeps duplicate webhooks from spawning extra
   * rows here.
   */
  active: defineQuery(({ ctx }: { ctx: Context }) =>
    zql.userAlerts
      .where("userId", ctx?.userId ?? NO_MATCH_ID)
      .where("resolvedAt", "IS", null)
      .orderBy("createdAt", "desc"),
  ),
};
