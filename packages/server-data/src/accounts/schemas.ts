import {
  bankAccount,
  bankBalance,
  bankConnection,
  bankConnectionJsonbSelectRefinements,
  institution,
  institutionJsonbSelectRefinements,
} from "@cobalt-web/db/schema/banking";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// ── Row schemas from DB (with JSONB refinements) ────────────────────

const bankAccountRowSchema = createSelectSchema(bankAccount);
const bankBalanceRowSchema = createSelectSchema(bankBalance);
const bankConnectionRowSchema = createSelectSchema(bankConnection, {
  ...bankConnectionJsonbSelectRefinements,
});
const institutionRowSchema = createSelectSchema(institution, {
  ...institutionJsonbSelectRefinements,
});

// ── Param / body schemas ────────────────────────────────────────────

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
const bankAccountDetailPickedSchema = bankAccountRowSchema
  .pick({
    mask: true,
    name: true,
    plaidAccountId: true,
    plaidItemId: true,
    subtype: true,
    type: true,
  })
  .extend(
    bankBalanceRowSchema.pick({
      available: true,
      current: true,
      isoCurrencyCode: true,
      limit: true,
      unofficialCurrencyCode: true,
      updatedAt: true,
      userOverrideCreditLimit: true,
    }).shape
  )
  .extend(
    bankConnectionRowSchema.pick({
      billedProducts: true,
      error: true,
      institutionId: true,
      institutionName: true,
      newAccountsAvailable: true,
      pendingDisconnectAt: true,
    }).shape
  )
  .extend(
    institutionRowSchema.pick({
      logo: true,
      url: true,
    }).shape
  );

/** Full bank account DTO returned by getAllAccountsWithInstitutions. */
export const bankAccountSchema = bankAccountDetailPickedSchema.extend({
  /** Coalesced from `isoCurrencyCode` / `unofficialCurrencyCode` for convenience. */
  currency: z.string().nullable(),
  /** Balance row may be missing; overrides Drizzle `notNull` on the column. */
  current: z.number().nullable(),
  hasInvestmentAccounts: z.boolean(),
  /** ISO strings on the wire; overrides Drizzle `Date` inference from timestamps. */
  pendingDisconnectAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

/** Subset of columns for list views; list-only computed flags in `extend`. */
const bankAccountListPickedSchema = bankAccountRowSchema
  .pick({
    mask: true,
    name: true,
    plaidAccountId: true,
    plaidItemId: true,
    subtype: true,
    type: true,
  })
  .extend(
    bankBalanceRowSchema.pick({
      current: true,
      isoCurrencyCode: true,
      limit: true,
      unofficialCurrencyCode: true,
      updatedAt: true,
      userOverrideCreditLimit: true,
    }).shape
  )
  .extend(
    bankConnectionRowSchema.pick({
      institutionName: true,
      newAccountsAvailable: true,
    }).shape
  )
  .extend(institutionRowSchema.pick({ logo: true }).shape);

/** Lightweight list item for the accounts page. */
export const bankAccountListItemSchema = bankAccountListPickedSchema.extend({
  canAddInvestments: z.boolean(),
  /** Effective limit: `userOverrideCreditLimit ?? limit` (not a single DB column). */
  creditLimit: z.number().nullable(),
  currency: z.string().nullable(),
  /** Balance row may be missing; overrides Drizzle `notNull` on the column. */
  current: z.number().nullable(),
  hasInvestments: z.boolean(),
  hasLiabilities: z.boolean(),
  needsReauth: z.boolean(),
  pendingDisconnectAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

/** Plaid item (bank connection) DTO. */
export const plaidItemSchema = bankConnectionRowSchema
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
export const plaidAccountForItemSchema = bankAccountRowSchema
  .pick({
    id: true,
    mask: true,
    name: true,
    officialName: true,
    plaidAccountId: true,
    plaidItemId: true,
    subtype: true,
    type: true,
    verificationStatus: true,
  })
  .extend({
    createdAt: z.string(),
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

// ── Inferred DTOs (single source of truth with OpenAPI) ─────────────

/** Full bank account detail — matches `bankAccountSchema` / `bankAccountDetailResponseSchema`. */
export type BankAccountDTO = z.infer<typeof bankAccountSchema>;

/** List row — matches `bankAccountListItemSchema`. */
export type BankAccountListItem = z.infer<typeof bankAccountListItemSchema>;

export type PlaidItemDTO = z.infer<typeof plaidItemSchema>;
export type PlaidItemAlertDTO = z.infer<typeof plaidItemAlertSchema>;
export type PlaidAccountForItemDTO = z.infer<typeof plaidAccountForItemSchema>;
