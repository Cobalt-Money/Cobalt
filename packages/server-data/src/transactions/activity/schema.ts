import { z } from "@hono/zod-openapi";

/** Single row from `transaction_edit`. */
export const transactionActivityEventSchema = z
  .object({
    actor: z.enum(["user", "system"]),
    createdAt: z.string(),
    field: z.enum([
      "amount",
      "category",
      "date",
      "location",
      "merchantName",
      "name",
      "notes",
      "tags",
    ]),
    id: z.string(),
    /** Native value, type discriminated by `field`: name/date=string, amount=number, category={primary,detailed,confidence?}, notes=markdown string (historical rows may still hold Tiptap JSON). */
    newValue: z.unknown().nullable(),
    oldValue: z.unknown().nullable(),
  })
  .openapi("TransactionActivityEvent");

export const transactionActivityResponseSchema = z
  .object({
    events: z.array(transactionActivityEventSchema),
  })
  .openapi("TransactionActivityResponse");

export type TransactionActivityItem = z.infer<typeof transactionActivityEventSchema>;
