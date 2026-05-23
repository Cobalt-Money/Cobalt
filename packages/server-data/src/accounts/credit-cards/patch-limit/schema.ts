import { z } from "@hono/zod-openapi";

export const patchCreditLimitSchema = z
  .object({
    creditLimit: z.number().positive(),
  })
  .openapi("PatchCreditLimit");

export type PatchCreditLimit = z.infer<typeof patchCreditLimitSchema>;
