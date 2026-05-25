import { z } from "@hono/zod-openapi";

/** Recurring stream (see `getRecurringStreams`). */
export const recurringTransactionSchema = z
  .object({
    accountId: z.string(),
    accountName: z.string(),
    accountSubtype: z.string().nullable(),
    accountType: z.string(),
    averageAmount: z.number(),
    category: z
      .object({
        groupName: z.string(),
        groupSystemKey: z.string().nullable(),
        iconKey: z.string(),
        id: z.uuid(),
        name: z.string(),
        systemKey: z.string().nullable(),
      })
      .nullable(),
    description: z.string(),
    firstDate: z.string(),
    frequency: z.string(),
    id: z.uuid(),
    institutionLogo: z.string().nullable(),
    institutionName: z.string().nullable(),
    institutionUrl: z.string().nullable(),
    isActive: z.boolean(),
    lastAmount: z.number(),
    lastDate: z.string(),
    merchantName: z.string().nullable(),
    predictedNextDate: z.string().nullable(),
    status: z.string(),
    streamId: z.string().nullable(),
    streamType: z.enum(["inflow", "outflow"]),
    transactionIds: z.array(z.string()),
    updatedAt: z.string().nullable(),
  })
  .openapi("RecurringStreamResponse");

export const getRecurringTransactionResponseSchema = z
  .object({
    streams: z.array(recurringTransactionSchema),
  })
  .openapi("RecurringStreamsResponse");
