import { z } from "@hono/zod-openapi";

export const userBrokeragesResponseSchema = z.object({
  data: z.array(z.string()),
});

export type UserBrokeragesResponse = z.infer<typeof userBrokeragesResponseSchema>;
