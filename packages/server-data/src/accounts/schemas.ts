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
import { AccountSubtype, AccountType } from "plaid";

// ── Row schemas from DB (with JSONB refinements) ────────────────────

const financialAccountRowSchema = createSelectSchema(financialAccount);
const balanceRowSchema = createSelectSchema(balance);
const plaidConnectionRowSchema = createSelectSchema(plaidConnection, {
  ...plaidConnectionJsonbSelectRefinements,
});
const institutionRowSchema = createSelectSchema(institution, {
  ...institutionJsonbSelectRefinements,
});

// ── Param / body schemas ────────────────────────────────────────────

/** Filters for `listAccounts`. Both fields are Plaid SDK enums. */
export const accountListQuerySchema = z.object({
  subtype: z.enum(AccountSubtype).optional(),
  type: z.enum(AccountType).optional(),
});
export type AccountListQuery = z.infer<typeof accountListQuerySchema>;

export const accountIdParamSchema = z.object({
  id: z.string(),
});

export const itemIdParamSchema = z.object({
  itemId: z.string(),
});

export const creditLimitBodySchema = z.object({
  creditLimit: z.number().positive(),
});

// ── Response DTOs ───────────────────────────────────────────────────

/** Standard success response for mutations. */
export const successResponseSchema = z.object({
  message: z.string().optional(),
  success: z.boolean(),
});

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

/** Full bank account DTO returned by getAllAccountsWithInstitutions. */
export const bankAccountSchema = bankAccountDetailPickedSchema.extend({
  /** Currency code (ISO 4217). */
  currency: z.string().nullable(),
  hasInvestmentAccounts: z.boolean(),
  /** ISO string on the wire. */
  pendingDisconnectAt: z.string().nullable(),
});

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
export const bankAccountListItemSchema = bankAccountListPickedSchema.extend({
  canAddInvestments: z.boolean(),
  /** Effective: `userOverrideCreditLimit ?? balance.creditLimit`. */
  creditLimit: z.number().nullable(),
  currency: z.string().nullable(),
  hasInvestments: z.boolean(),
  hasLiabilities: z.boolean(),
  needsReauth: z.boolean(),
  pendingDisconnectAt: z.string().nullable(),
});

/** Plaid item (bank connection) DTO. */
export const plaidItemSchema = plaidConnectionRowSchema
  .pick({
    availableProducts: true,
    billedProducts: true,
    error: true,
    id: true,
    institutionId: true,
    institutionLogo: true,
    institutionName: true,
    newAccountsAvailable: true,
    plaidItemId: true,
    userId: true,
  })
  .extend({
    createdAt: z.string(),
    pendingDisconnectAt: z.string().nullable(),
    updatedAt: z.string(),
  });

/** Plaid item alert DTO for items needing attention. */
export const plaidItemAlertSchema = z.object({
  institutionLogo: z.string().nullable(),
  institutionName: z.string(),
  needsReauth: z.boolean(),
  newAccountsAvailable: z.boolean(),
  pendingDisconnectAt: z.string().nullable(),
  plaidItemId: z.string(),
});

/** Account info for a specific Plaid item. */
export const plaidAccountForItemSchema = financialAccountRowSchema
  .pick({
    id: true,
    mask: true,
    name: true,
    officialName: true,
    subtype: true,
    type: true,
  })
  .extend({
    createdAt: z.string(),
    plaidAccountId: z.string().nullable(),
    plaidItemId: z.string(),
    updatedAt: z.string(),
  });

// ── Response wrappers ───────────────────────────────────────────────

export const bankAccountListResponseSchema = z.object({
  accounts: z.array(bankAccountListItemSchema),
});

export const bankAccountDetailResponseSchema = bankAccountSchema;

export const creditCardListResponseSchema = z.object({
  accounts: z.array(bankAccountListItemSchema),
});

export const plaidItemListResponseSchema = z.object({
  items: z.array(plaidItemSchema),
});

export const plaidItemAlertListResponseSchema = z.object({
  alerts: z.array(plaidItemAlertSchema),
});

export const plaidAccountsForItemResponseSchema = z.object({
  accounts: z.array(plaidAccountForItemSchema),
});

// ── Inferred DTOs ───────────────────────────────────────────────────

export type BankAccountDTO = z.infer<typeof bankAccountSchema>;
export type BankAccountListItem = z.infer<typeof bankAccountListItemSchema>;
export type PlaidItemDTO = z.infer<typeof plaidItemSchema>;
export type PlaidItemAlertDTO = z.infer<typeof plaidItemAlertSchema>;
export type PlaidAccountForItemDTO = z.infer<typeof plaidAccountForItemSchema>;

export type { PlaidItemErrorJson, StringArrayJson };
