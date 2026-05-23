import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { plaidConnectionJsonbSelectRefinements } from "@cobalt-web/db/schema/providers/plaid/zod";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

const plaidConnectionRowSchema = createSelectSchema(plaidConnection, {
  ...plaidConnectionJsonbSelectRefinements,
});

/** Plaid item (bank connection) DTO. */
export const plaidItemResponseSchema = plaidConnectionRowSchema
  .pick({
    availableProducts: true,
    billedProducts: true,
    error: true,
    id: true,
    institutionId: true,
    institutionLogo: true,
    institutionName: true,
    newAccountsAvailable: true,
    plaidItemId: true,
    userId: true,
  })
  .extend({
    createdAt: z.string(),
    pendingDisconnectAt: z.string().nullable(),
    updatedAt: z.string(),
  })
  .openapi("PlaidItem");

export type PlaidItemResponse = z.infer<typeof plaidItemResponseSchema>;
