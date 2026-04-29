import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { recurring } from "@cobalt-web/db/schema/accounts/banking/transactions/recurring";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import {
  locationJsonSchema,
  recurringStreamJsonbSelectRefinements,
  transactionJsonbSelectRefinements,
  userOverrideCategoryJsonSchema,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import type { TransactionNotesJson } from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

// Tiptap doc kept opaque (`z.unknown()`) at API boundary. The recursive
// structural type would otherwise leak into Hono's RPC schema accumulator
// and trip TS2589 once enough sub-routers are chained. Cheap workaround
// since we're migrating from Tiptap → Milkdown soon; revisit then.
export type TiptapDoc = TransactionNotesJson;

const NOTES_MAX_SERIALIZED_BYTES = 100_000;

const tiptapDocBaseSchema = z.unknown();

export const tiptapDocSchema = tiptapDocBaseSchema.refine(
  (doc) => JSON.stringify(doc).length <= NOTES_MAX_SERIALIZED_BYTES,
  { message: `Note exceeds ${NOTES_MAX_SERIALIZED_BYTES} serialized bytes` }
);

/** `transaction` row fields exposed on the list (see `getUserTransactions`). */
const transactionListItemRowSchema = createSelectSchema(transaction, {
  ...transactionJsonbSelectRefinements,
});

/** Joined `financial_account` columns (`account.name` / `account.type` in the mapper). */
const bankAccountListSlice = createSelectSchema(financialAccount).pick({
  name: true,
  type: true,
});

/** Joined `financial_account` for recurring streams (includes `subtype`). */
const bankAccountRecurringSlice = createSelectSchema(financialAccount).pick({
  name: true,
  subtype: true,
  type: true,
});

/** Joined `institution` columns (`inst.*` in the mapper). */
const institutionListSlice = createSelectSchema(institution).pick({
  logo: true,
  name: true,
  url: true,
});

/** Standard JSON body for successful transaction override PATCHes. */
export const successResponse = z.object({
  success: z.boolean(),
});

/** List transaction DTO: picked `transaction` columns + joined account / institution (see `getUserTransactions`). */
export const transactionListItemSchema = transactionListItemRowSchema
  .pick({
    authorizedDate: true,
    category: true,
    categoryConfidence: true,
    categoryDetail: true,
    counterparties: true,
    date: true,
    id: true,
    lockedFields: true,
    logoUrl: true,
    merchantName: true,
    name: true,
    pending: true,
    source: true,
    userOverrideLocation: true,
    website: true,
  })
  .extend({
    accountName: bankAccountListSlice.shape.name,
    accountType: bankAccountListSlice.shape.type,
    amount: z.number(),
    institutionLogo: institutionListSlice.shape.logo,
    institutionName: institutionListSlice.shape.name.nullable(),
    institutionUrl: institutionListSlice.shape.url,
    location: locationJsonSchema.nullable(),
    notes: tiptapDocBaseSchema.nullable(),
    plaidAccountId: z.string().nullable(),
  });

export type TransactionListItem = z.infer<typeof transactionListItemSchema>;

const recurringStreamListRowSchema = createSelectSchema(recurring, {
  ...recurringStreamJsonbSelectRefinements,
});

/** Recurring stream DTO: picked `recurring_stream` columns + joined account / institution (see `getRecurringStreams`). */
export const recurringStreamSchema = recurringStreamListRowSchema
  .pick({
    category: true,
    categoryConfidence: true,
    categoryDetail: true,
    description: true,
    firstDate: true,
    frequency: true,
    id: true,
    isActive: true,
    lastDate: true,
    merchantName: true,
    predictedNextDate: true,
    status: true,
    streamType: true,
    transactionIds: true,
  })
  .extend({
    accountName: bankAccountRecurringSlice.shape.name,
    accountSubtype: bankAccountRecurringSlice.shape.subtype.nullable(),
    accountType: bankAccountRecurringSlice.shape.type,
    averageAmount: z.number(),
    institutionLogo: institutionListSlice.shape.logo,
    institutionName: institutionListSlice.shape.name.nullable(),
    institutionUrl: institutionListSlice.shape.url,
    lastAmount: z.number(),
    streamId: z.string().nullable(),
    updatedAt: z.string().nullable(),
  });

export const creditSpendingSchema = z.object({
  averageLabel: z.enum(["daily", "weekly", "monthly", "yearly"]),
  averageSpending: z.number(),
  spending: z.array(z.object({ amount: z.number(), date: z.string() })),
  totalSpending: z.number(),
});

export const transactionIdParamSchema = z.object({
  transactionId: z.uuid(),
});

export const transactionListQuerySchema = z.object({
  accountType: z.string().optional(),
  endDate: z.string().optional(),
  maxAmount: z.coerce.number().optional(),
  minAmount: z.coerce.number().optional(),
  page: z.coerce.number().min(0).default(0),
  pageSize: z.coerce.number().min(1).default(50),
  pendingFilter: z.enum(["true", "false"]).optional(),
  primaryCategory: z.string().optional(),
  searchQuery: z.string().optional(),
  startDate: z.string().optional(),
});

export const transactionListResponseSchema = z.object({
  transactions: z.array(transactionListItemSchema),
});

export const recurringStreamsResponseSchema = z.object({
  streams: z.array(recurringStreamSchema),
});

export const creditSpendingQuerySchema = z.object({
  accountId: z.string().optional(),
  period: z.enum(["1w", "1m", "3m", "6m", "1y", "all"]),
});

/**
 * Sparse partial update for a transaction (RFC 7396 semantics):
 * - Omit a field → unchanged.
 * - Non-null value → update column, add to lockedFields, append transaction_edit row.
 * - `null` → restore original (from transaction_edit old_value), remove from lockedFields.
 * Location is still an override-only field (not tracked in transaction_edit).
 */
export const transactionPatchBodySchema = z
  .object({
    category: userOverrideCategoryJsonSchema.nullable().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    name: z.string().min(1).nullable().optional(),
    notes: tiptapDocSchema.nullable().optional(),
    userOverrideLocation: locationJsonSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

/** Single Nominatim search result, normalised to our `LocationJson` plus `display_name`. */
export const geocodeSearchResultSchema = z.object({
  displayName: z.string(),
  location: locationJsonSchema,
});

export const geocodeSearchResponseSchema = z.object({
  results: z.array(geocodeSearchResultSchema),
});

export const geocodeSearchQuerySchema = z.object({
  q: z.string().min(2).max(200),
});

/** Single row from `transaction_edit`. */
export const transactionActivityItemSchema = z.object({
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
  ]),
  id: z.string(),
  /** Native value, type discriminated by `field`: name/date=string, amount=number, category={primary,detailed,confidence?}, notes=Tiptap doc. */
  newValue: z.unknown().nullable(),
  oldValue: z.unknown().nullable(),
});

export const transactionActivityResponseSchema = z.object({
  events: z.array(transactionActivityItemSchema),
});

export type TransactionActivityItem = z.infer<
  typeof transactionActivityItemSchema
>;
