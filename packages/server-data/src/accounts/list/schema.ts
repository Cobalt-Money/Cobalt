import { z } from "@hono/zod-openapi";
import { AccountSubtype, AccountType } from "plaid";

import { bankAccountListItemSchema } from "../_shared/schema.js";

/** Generic flat account row exposed by `getAccounts` (any source). */
export const accountListItemSchema = z
  .object({
    creditLimit: z.number().nullable(),
    currency: z.string().nullable(),
    current: z.number().nullable(),
    id: z.string(),
    institutionName: z.string().nullable(),
    mask: z.string().nullable(),
    name: z.string(),
    subtype: z.string().nullable(),
    type: z.string(),
  })
  .openapi("AccountListItem");

export type AccountListItem = z.infer<typeof accountListItemSchema>;

/** Filters for `getAccounts`. Both fields are Plaid SDK enums. */
export const getAccountsSchema = z.object({
  subtype: z.enum(AccountSubtype).optional(),
  type: z.enum(AccountType).optional(),
});
export type GetAccounts = z.infer<typeof getAccountsSchema>;

export const bankAccountsResponseSchema = z
  .object({
    accounts: z.array(bankAccountListItemSchema),
  })
  .openapi("BankAccountsResponse");

export type BankAccountsResponse = z.infer<typeof bankAccountsResponseSchema>;

/** Filter for `GET /api/accounts`. Omit to return all bank-shape types. */
export const bankAccountsQuerySchema = z.object({
  type: z.enum(["depository", "credit", "loan"]).optional(),
});
export type BankAccountsQuery = z.infer<typeof bankAccountsQuerySchema>;
