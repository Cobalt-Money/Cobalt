import { z } from "@hono/zod-openapi";

export const disconnectBankAccountResponseSchema = z
  .object({
    message: z.string(),
    success: z.boolean(),
  })
  .openapi("DisconnectBankAccountResponse");

export type DisconnectBankAccountResponse = z.infer<typeof disconnectBankAccountResponseSchema>;
