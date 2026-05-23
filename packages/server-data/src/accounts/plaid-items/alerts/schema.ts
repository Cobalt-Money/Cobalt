import { z } from "@hono/zod-openapi";

export const plaidItemAlertSchema = z
  .object({
    institutionLogo: z.string().nullable(),
    institutionName: z.string(),
    needsReauth: z.boolean(),
    newAccountsAvailable: z.boolean(),
    pendingDisconnectAt: z.string().nullable(),
    plaidItemId: z.string(),
  })
  .openapi("PlaidItemAlert");

export type PlaidItemAlert = z.infer<typeof plaidItemAlertSchema>;

export const plaidItemAlertsResponseSchema = z
  .object({
    alerts: z.array(plaidItemAlertSchema),
  })
  .openapi("PlaidItemAlertsResponse");

export type PlaidItemAlertsResponse = z.infer<typeof plaidItemAlertsResponseSchema>;
