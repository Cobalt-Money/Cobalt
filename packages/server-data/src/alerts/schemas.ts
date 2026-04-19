import { userAlerts } from "@cobalt-web/db/schema/features/user-alerts";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

const userAlertRowSchema = createSelectSchema(userAlerts, {
  // Free-form metadata bag — populated by Plaid/SnapTrade workflows with
  // institution/brokerage display info the UI uses to render logos + names.
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

/** Single alert DTO — timestamps serialized as ISO strings. */
export const alertSchema = userAlertRowSchema
  .pick({
    id: true,
    message: true,
    metadata: true,
    source: true,
    sourceId: true,
    status: true,
    title: true,
    type: true,
    userId: true,
  })
  .extend({
    createdAt: z.string(),
    resolvedAt: z.string().nullable(),
  });

export const alertListResponseSchema = z.object({
  alerts: z.array(alertSchema),
});

export const alertIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type AlertDTO = z.infer<typeof alertSchema>;
