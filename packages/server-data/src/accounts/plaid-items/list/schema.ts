import { z } from "@hono/zod-openapi";

import { plaidItemResponseSchema } from "../_shared.js";

export const plaidItemsResponseSchema = z
  .object({
    items: z.array(plaidItemResponseSchema),
  })
  .openapi("PlaidItemsResponse");

export type PlaidItemsResponse = z.infer<typeof plaidItemsResponseSchema>;
