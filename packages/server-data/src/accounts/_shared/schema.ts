import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { balance } from "@cobalt-web/db/schema/accounts/balance";
import { plaidConnection } from "@cobalt-web/db/schema/providers/plaid/connection";
import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";
import {
  institutionJsonbSelectRefinements,
  plaidConnectionJsonbSelectRefinements,
} from "@cobalt-web/db/schema/providers/plaid/zod";
import type {
  PlaidItemErrorJson,
  StringArrayJson,
} from "@cobalt-web/db/schema/providers/plaid/zod";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Row schemas from DB (with JSONB refinements) ────────────────────

const financialAccountRowSchema = createSelectSchema(financialAccount);
const balanceRowSchema = createSelectSchema(balance);
const plaidConnectionRowSchema = createSelectSchema(plaidConnection, {
  ...plaidConnectionJsonbSelectRefinements,
});
const institutionRowSchema = createSelectSchema(institution, {
  ...institutionJsonbSelectRefinements,
});

// ── Path param schemas ──────────────────────────────────────────────

export const accountIdSchema = z.object({
  id: z.string(),
});

export const plaidItemIdSchema = z.object({
  itemId: z.string(),
});

// ── Generic success response ────────────────────────────────────────

export const successResponseSchema = z
  .object({
    message: z.string().optional(),
    success: z.boolean(),
  })
  .openapi("SuccessResponse");

// ── Bank account response shapes (shared by list + detail) ──────────

/** Picked column shapes (Drizzle camelCase = API names). Merged with computed fields below. */
const bankAccountDetailPickedSchema = financialAccountRowSchema
  .pick({
    mask: true,
    name: true,
    subtype: true,
    type: true,
  })
  .extend({
    /** Provider-external id (Plaid account_id). */
    plaidAccountId: z.string().nullable(),
    /** Plaid item id resolved from plaid_connection. */
    plaidItemId: z.string(),
  })
  .extend(
    balanceRowSchema.pick({
      currency: true,
    }).shape,
  )
  .extend({
    available: z.number().nullable(),
    creditLimit: z.number().nullable(),
    current: z.number().nullable(),
    updatedAt: z.string().nullable(),
    userOverrideCreditLimit: z.number().nullable(),
  })
  .extend(
    plaidConnectionRowSchema.pick({
      billedProducts: true,
      error: true,
      institutionId: true,
      institutionName: true,
      newAccountsAvailable: true,
    }).shape,
  )
  .extend(
    institutionRowSchema.pick({
      logo: true,
      url: true,
    }).shape,
  );

/** Full bank account DTO. */
export const bankAccountResponseSchema = bankAccountDetailPickedSchema
  .extend({
    /** Currency code (ISO 4217). */
    currency: z.string().nullable(),
    hasInvestmentAccounts: z.boolean(),
    /** ISO string on the wire. */
    pendingDisconnectAt: z.string().nullable(),
  })
  .openapi("BankAccount");

export type BankAccountResponse = z.infer<typeof bankAccountResponseSchema>;

/** Subset of columns for list views; list-only computed flags in `extend`. */
const bankAccountListPickedSchema = financialAccountRowSchema
  .pick({
    mask: true,
    name: true,
    subtype: true,
    type: true,
  })
  .extend({
    plaidAccountId: z.string().nullable(),
    plaidItemId: z.string(),
  })
  .extend(
    balanceRowSchema.pick({
      currency: true,
    }).shape,
  )
  .extend({
    current: z.number().nullable(),
    updatedAt: z.string().nullable(),
    userOverrideCreditLimit: z.number().nullable(),
  })
  .extend(
    plaidConnectionRowSchema.pick({
      institutionName: true,
      newAccountsAvailable: true,
    }).shape,
  )
  .extend(institutionRowSchema.pick({ logo: true }).shape);

/** Lightweight list item for the accounts page. */
export const bankAccountListItemSchema = bankAccountListPickedSchema
  .extend({
    canAddInvestments: z.boolean(),
    /** Effective: `userOverrideCreditLimit ?? balance.creditLimit`. */
    creditLimit: z.number().nullable(),
    currency: z.string().nullable(),
    hasInvestments: z.boolean(),
    hasLiabilities: z.boolean(),
    needsReauth: z.boolean(),
    pendingDisconnectAt: z.string().nullable(),
  })
  .openapi("BankAccountListItem");

export type BankAccountListItem = z.infer<typeof bankAccountListItemSchema>;

export type { PlaidItemErrorJson, StringArrayJson };
