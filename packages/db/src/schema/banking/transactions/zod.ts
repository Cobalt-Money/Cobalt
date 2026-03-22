/**
 * Zod schemas for Plaid-shaped `jsonb` on `transaction` / `recurring_stream`.
 * Types are `z.infer` for Drizzle `.$type<>()`; refinements feed `createSelectSchema`.
 */
import { z } from "zod";

/** Plaid `personal_finance_category` on transactions & recurring streams. */
export const personalFinanceCategoryJsonSchema = z.object({
  confidence_level: z.string().optional(),
  detailed: z.string(),
  primary: z.string(),
  version: z.enum(["v1", "v2"]).optional(),
});

export type PersonalFinanceCategoryJson = z.infer<
  typeof personalFinanceCategoryJsonSchema
>;

/** User-edited category override (`user_override_category`). */
export const userOverrideCategoryJsonSchema = z.object({
  detailed: z.string(),
  primary: z.string(),
});

export type UserOverrideCategoryJson = z.infer<
  typeof userOverrideCategoryJsonSchema
>;

/** Plaid `location` on a transaction (physical merchants; often all-null for online). */
export const locationJsonSchema = z.object({
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  postal_code: z.string().nullable(),
  region: z.string().nullable(),
  store_number: z.string().nullable(),
});

export type LocationJson = z.infer<typeof locationJsonSchema>;

/** Plaid legacy `category` array (string labels). */
export const legacyCategoryArrayJsonSchema = z.array(z.string()).nullable();

export type LegacyCategoryArrayJson = z.infer<
  typeof legacyCategoryArrayJsonSchema
>;

/** Plaid `payment_meta` (ACH/wire-style metadata; often all-null). */
export const paymentMetaJsonSchema = z.object({
  by_order_of: z.string().nullable(),
  payee: z.string().nullable(),
  payer: z.string().nullable(),
  payment_method: z.string().nullable(),
  payment_processor: z.string().nullable(),
  ppd_id: z.string().nullable(),
  reason: z.string().nullable(),
  reference_number: z.string().nullable(),
});

export type PaymentMetaJson = z.infer<typeof paymentMetaJsonSchema>;

/** Plaid counterparty `type` enum values. */
export const transactionCounterpartyTypeSchema = z.enum([
  "merchant",
  "financial_institution",
  "payment_app",
  "marketplace",
  "payment_terminal",
  "income_source",
]);

export type TransactionCounterpartyType = z.infer<
  typeof transactionCounterpartyTypeSchema
>;

/** Plaid `NumbersIBANNullable` — effectively an empty object in practice. */
export const numbersIbanNullableJsonSchema = z.object({}).strict();

export type NumbersIbanNullableJson = z.infer<
  typeof numbersIbanNullableJsonSchema
>;

export const counterpartyNumbersInternationalJsonSchema = z.object({
  bic: z.string().nullable().optional(),
  iban: z.union([numbersIbanNullableJsonSchema, z.null()]).optional(),
});

export type CounterpartyNumbersInternationalJson = z.infer<
  typeof counterpartyNumbersInternationalJsonSchema
>;

export const counterpartyNumbersBacsJsonSchema = z.object({
  account: z.string().nullable().optional(),
  sort_code: z.string().nullable().optional(),
});

export type CounterpartyNumbersBacsJson = z.infer<
  typeof counterpartyNumbersBacsJsonSchema
>;

export const counterpartyNumbersJsonSchema = z.object({
  bacs: counterpartyNumbersBacsJsonSchema.nullable().optional(),
  international: counterpartyNumbersInternationalJsonSchema
    .nullable()
    .optional(),
});

export type CounterpartyNumbersJson = z.infer<
  typeof counterpartyNumbersJsonSchema
>;

/** Plaid `counterparties[]` element. */
export const transactionCounterpartyJsonSchema = z.object({
  account_numbers: counterpartyNumbersJsonSchema.nullable().optional(),
  confidence_level: z.string().nullable().optional(),
  entity_id: z.string().nullable().optional(),
  logo_url: z.string().nullable(),
  name: z.string(),
  type: transactionCounterpartyTypeSchema,
  website: z.string().nullable(),
});

export type TransactionCounterpartyJson = z.infer<
  typeof transactionCounterpartyJsonSchema
>;

export const counterpartiesArrayJsonSchema = z
  .array(transactionCounterpartyJsonSchema)
  .nullable();

export type CounterpartiesArrayJson = z.infer<
  typeof counterpartiesArrayJsonSchema
>;

/** `transaction_ids` on `recurring_stream` (non-null array of Plaid transaction ids). */
export const recurringTransactionIdsJsonSchema = z.array(z.string());

export type RecurringTransactionIdsJson = z.infer<
  typeof recurringTransactionIdsJsonSchema
>;

/** Refinements for `createSelectSchema(transaction, …)`. */
export const transactionJsonbSelectRefinements = {
  category: legacyCategoryArrayJsonSchema,
  counterparties: counterpartiesArrayJsonSchema,
  location: locationJsonSchema.nullable(),
  paymentMeta: paymentMetaJsonSchema.nullable(),
  personalFinanceCategory: personalFinanceCategoryJsonSchema.nullable(),
  userOverrideCategory: userOverrideCategoryJsonSchema.nullable(),
} as const;

/** Refinements for `createSelectSchema(recurringStream, …)`. */
export const recurringStreamJsonbSelectRefinements = {
  category: legacyCategoryArrayJsonSchema,
  personalFinanceCategory: personalFinanceCategoryJsonSchema.nullable(),
  streamType: z.enum(["inflow", "outflow"]),
  transactionIds: recurringTransactionIdsJsonSchema,
} as const;
