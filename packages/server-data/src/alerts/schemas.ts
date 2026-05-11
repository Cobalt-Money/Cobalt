import { userAlerts } from "@cobalt-web/db/schema/users/alerts";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

const userAlertRowSchema = createSelectSchema(userAlerts, {
  // Free-form metadata bag — populated by Plaid/SnapTrade workflows with
  // institution/brokerage display info the UI uses to render logos + names.
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

/**
 * Alert DTO — `title` and `message` are computed at read time by
 * `formatAlert(type, institutionName)`, not stored. Institution name is
 * resolved live in `getActiveAlerts` by joining `plaid_connection` and
 * `financial_account` on the alert's `sourceId`.
 */
export const alertSchema = userAlertRowSchema
  .pick({
    id: true,
    metadata: true,
    source: true,
    sourceId: true,
    type: true,
    userId: true,
  })
  .extend({
    createdAt: z.string(),
    message: z.string(),
    resolvedAt: z.string().nullable(),
    title: z.string(),
  });

export const alertListResponseSchema = z.object({
  alerts: z.array(alertSchema),
});

export type AlertDTO = z.infer<typeof alertSchema>;
