import { z } from "@hono/zod-openapi";

import { bankAccountListItemSchema } from "../../_shared/schema.js";

export const creditCardsResponseSchema = z
  .object({
    accounts: z.array(bankAccountListItemSchema),
  })
  .openapi("CreditCardsResponse");

export type CreditCardsResponse = z.infer<typeof creditCardsResponseSchema>;
