import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

const financialAccountRowSchema = createSelectSchema(financialAccount);

export const plaidAccountForItemResponseSchema = financialAccountRowSchema
  .pick({
    id: true,
    mask: true,
    name: true,
    officialName: true,
    subtype: true,
    type: true,
  })
  .extend({
    createdAt: z.string(),
    plaidAccountId: z.string().nullable(),
    plaidItemId: z.string(),
    updatedAt: z.string(),
  })
  .openapi("PlaidAccount");

export type PlaidAccountForItemResponse = z.infer<typeof plaidAccountForItemResponseSchema>;

export const plaidAccountsForItemResponseSchema = z
  .object({
    accounts: z.array(plaidAccountForItemResponseSchema),
  })
  .openapi("PlaidAccountsForItemResponse");

export type PlaidAccountsForItemResponse = z.infer<typeof plaidAccountsForItemResponseSchema>;
