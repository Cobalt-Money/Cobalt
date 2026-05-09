import { financialAccount } from "@cobalt-web/db/schema/accounts/account";
import { category } from "@cobalt-web/db/schema/accounts/banking/categories/category";
import { categoryGroup } from "@cobalt-web/db/schema/accounts/banking/categories/category-group";
import { recurring } from "@cobalt-web/db/schema/accounts/banking/transactions/recurring";
import { transaction } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction";
import { LOCK_KEY_GUARDED_COLUMNS } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import {
  locationJsonSchema as _locationJsonSchema,
  recurringStreamJsonbSelectRefinements,
  transactionCounterpartyJsonSchema as _transactionCounterpartyJsonSchema,
  transactionJsonbSelectRefinements,
  transactionNotesMarkdownSchema,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { institution } from "@cobalt-web/db/schema/providers/plaid/institution";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

const notesMarkdownSchema = transactionNotesMarkdownSchema;

/** Plaid `location` jsonb on a transaction (named for OpenAPI components). */
export const locationJsonSchema = _locationJsonSchema.openapi("TransactionLocation");

/** Plaid `counterparties[]` element (named for OpenAPI components). */
export const transactionCounterpartySchema =
  _transactionCounterpartyJsonSchema.openapi("TransactionCounterparty");

/**
 * Per-field user-edit lock keys. Mirrors `LOCK_KEY_GUARDED_COLUMNS` in the DB
 * schema; presence of a key means subsequent provider syncs must not overwrite
 * the corresponding column(s).
 */
const LOCK_KEYS = Object.keys(LOCK_KEY_GUARDED_COLUMNS) as [
  keyof typeof LOCK_KEY_GUARDED_COLUMNS,
  ...(keyof typeof LOCK_KEY_GUARDED_COLUMNS)[],
];

export const transactionLockedFieldsSchema = z
  .array(z.enum(LOCK_KEYS))
  .openapi("TransactionLockedFields");

/** `transaction` row fields exposed on the list (see `getUserTransactions`). */
const transactionListItemRowSchema = createSelectSchema(transaction, {
  ...transactionJsonbSelectRefinements,
  lockedFields: transactionLockedFieldsSchema,
});

/** Joined `financial_account` columns (`account.name` / `account.type` in the mapper). */
const bankAccountListSlice = createSelectSchema(financialAccount).pick({
  logoDomain: true,
  name: true,
  subtype: true,
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

/** `category` columns picked from joined row. */
const categoryRowSlice = createSelectSchema(category).pick({
  iconKey: true,
  id: true,
  name: true,
  systemKey: true,
});

/** `category_group` columns picked from joined row. */
const categoryGroupRowSlice = createSelectSchema(categoryGroup).pick({
  name: true,
  systemKey: true,
});

/** Joined category slice exposed on list/detail rows. Null when row not yet backfilled. */
const transactionCategoryShape = categoryRowSlice
  .extend({
    groupName: categoryGroupRowSlice.shape.name,
    groupSystemKey: categoryGroupRowSlice.shape.systemKey,
  })
  .openapi("TransactionCategoryRef");

export const transactionCategorySchema = transactionCategoryShape.nullable();

/** List transaction DTO: picked `transaction` columns + joined account / institution (see `getUserTransactions`). */
export const transactionListItemSchema = transactionListItemRowSchema
  .pick({
    authorizedDate: true,
    counterparties: true,
    date: true,
    id: true,
    lockedFields: true,
    logoUrl: true,
    merchantName: true,
    name: true,
    pending: true,
    source: true,
    website: true,
  })
  .extend({
    accountLogoDomain: bankAccountListSlice.shape.logoDomain.nullable(),
    accountName: bankAccountListSlice.shape.name,
    accountSubtype: bankAccountListSlice.shape.subtype.nullable(),
    accountType: bankAccountListSlice.shape.type,
    amount: z.number(),
    category: transactionCategorySchema,
    institutionLogo: institutionListSlice.shape.logo,
    institutionName: institutionListSlice.shape.name.nullable(),
    institutionUrl: institutionListSlice.shape.url,
    location: locationJsonSchema.nullable(),
    notes: notesMarkdownSchema.nullable(),
    plaidAccountId: z.string().nullable(),
    tagIds: z.array(z.uuid()).default([]),
  })
  .openapi("Transaction");

export type TransactionListItem = z.infer<typeof transactionListItemSchema>;

const recurringStreamListRowSchema = createSelectSchema(recurring, {
  ...recurringStreamJsonbSelectRefinements,
});

/** Recurring stream DTO: picked `recurring_stream` columns + joined account / institution (see `getRecurringStreams`). */
export const recurringStreamSchema = recurringStreamListRowSchema
  .pick({
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
    category: transactionCategorySchema,
    institutionLogo: institutionListSlice.shape.logo,
    institutionName: institutionListSlice.shape.name.nullable(),
    institutionUrl: institutionListSlice.shape.url,
    lastAmount: z.number(),
    streamId: z.string().nullable(),
    updatedAt: z.string().nullable(),
  })
  .openapi("RecurringStream");

export const spendingBucketSchema = z
  .object({ amount: z.number(), date: z.string() })
  .openapi("SpendingBucket");

export const spendingSchema = z
  .object({
    averageLabel: z.enum(["daily", "weekly", "monthly", "yearly"]),
    averageSpending: z.number(),
    spending: z.array(spendingBucketSchema),
    totalSpending: z.number(),
  })
  .openapi("CreditSpendingResponse");

export const transactionIdParamSchema = z.object({
  transactionId: z.uuid(),
});

export const transactionListQuerySchema = z.object({
  accountType: z.string().optional(),
  cursor: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  maxAmount: z.coerce.number().optional(),
  minAmount: z.coerce.number().optional(),
  pendingFilter: z.enum(["true", "false"]).optional(),
  primaryCategory: z.string().optional(),
  searchQuery: z.string().optional(),
  startDate: z.string().optional(),
});

export const transactionListResponseSchema = z
  .object({
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
    transactions: z.array(transactionListItemSchema),
  })
  .openapi("TransactionsResponse");

export const recurringStreamsResponseSchema = z
  .object({
    streams: z.array(recurringStreamSchema),
  })
  .openapi("RecurringStreamsResponse");

export const spendingQuerySchema = z.object({
  accountId: z.string().optional(),
  accountType: z.enum(["credit", "depository", "all"]).default("all"),
  period: z.enum(["1w", "1m", "3m", "6m", "1y", "all"]),
});

/**
 * Sparse partial update for a transaction (RFC 7396 semantics):
 * - Omit a field → unchanged.
 * - Non-null value → update column(s), add to lockedFields, append transaction_edit row.
 * - `null` → restore original (from transaction_edit old_value), remove from lockedFields.
 */
export const transactionPatchBodySchema = z
  .object({
    /** SRI-311: FK to a row in `category`. `null` resets to original (Plaid-derived) cat. */
    categoryId: z.uuid().nullable().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    /** User-edited merchant location. Writes to flat lat/lon/address cols; `null` resets to original Plaid value. */
    location: locationJsonSchema.nullable().optional(),
    /** Plaid-normalized merchant name. `null` resets to original Plaid value. */
    merchantName: z.string().min(1).max(255).nullable().optional(),
    name: z.string().min(1).nullable().optional(),
    notes: notesMarkdownSchema.nullable().optional(),
    /** Full id-array replace of tags on the transaction. Pass `[]` to clear. */
    tags: z.array(z.uuid()).optional(),
    /**
     * Merchant website. Accepts bare domain (`starbucks.com`) or full URL
     * (`https://www.starbucks.com/`); normalized to bare lowercase domain
     * before storage. `null` clears the value.
     */
    website: z
      .string()
      .trim()
      .min(3)
      .max(2048)
      .regex(/^[^\s]+\.[^\s]+$/, "must look like a domain or URL")
      .nullable()
      .optional(),
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
    "tags",
  ]),
  id: z.string(),
  /** Native value, type discriminated by `field`: name/date=string, amount=number, category={primary,detailed,confidence?}, notes=markdown string (historical rows may still hold Tiptap JSON). */
  newValue: z.unknown().nullable(),
  oldValue: z.unknown().nullable(),
});

export const transactionActivityResponseSchema = z.object({
  events: z.array(transactionActivityItemSchema),
});

export type TransactionActivityItem = z.infer<typeof transactionActivityItemSchema>;
