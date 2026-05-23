import {
  counterpartiesArrayJsonSchema,
  transactionNotesMarkdownSchema as notesMarkdownSchema,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { z } from "@hono/zod-openapi";

import { locationJsonSchema, transactionLockedFieldsSchema } from "../_shared/schema.js";

/** Single transaction. Canonical shape; list endpoint returns an array of these. */
export const transactionResponseSchema = z
  .object({
    accountLogoDomain: z.string().nullable(),
    accountName: z.string(),
    accountSubtype: z.string().nullable(),
    accountType: z.string(),
    amount: z.number(),
    authorizedDate: z.string().nullable(),
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
    counterparties: counterpartiesArrayJsonSchema,
    date: z.string(),
    id: z.uuid(),
    institutionLogo: z.string().nullable(),
    institutionName: z.string().nullable(),
    institutionUrl: z.string().nullable(),
    location: locationJsonSchema.nullable(),
    lockedFields: transactionLockedFieldsSchema,
    logoUrl: z.string().nullable(),
    merchantName: z.string().nullable(),
    name: z.string(),
    notes: notesMarkdownSchema.nullable(),
    pending: z.boolean(),
    plaidAccountId: z.string().nullable(),
    source: z.enum(["plaid", "manual"]),
    tagIds: z.array(z.uuid()),
    website: z.string().nullable(),
  })
  .openapi("TransactionResponse");

export type TransactionResponse = z.infer<typeof transactionResponseSchema>;
