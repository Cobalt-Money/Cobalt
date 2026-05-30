import { z } from "@hono/zod-openapi";

import { enhancedBrokerageAccountSchema, successResponseSchema } from "../_shared/schema.js";

export const brokerageAccountListItemSchema = enhancedBrokerageAccountSchema
  .pick({
    accountDetails: true,
    accountStatus: true,
    accountType: true,
    balances: true,
    id: true,
    institutionName: true,
    name: true,
    needsReauth: true,
    snaptradeAuthorizationId: true,
  })
  .extend({
    plaidAccountId: z.string().optional(),
    source: z.enum(["plaid", "snaptrade", "manual"]).optional(),
  });

export const brokerageAccountsListResponseSchema = z.object({
  accounts: z.array(brokerageAccountListItemSchema),
});

export const disconnectBrokerageAccountResponseSchema = successResponseSchema.extend({
  message: z.string(),
});

export type BrokerageAccountListItem = z.infer<typeof brokerageAccountListItemSchema>;
export type BrokerageAccountsListResponse = z.infer<typeof brokerageAccountsListResponseSchema>;
