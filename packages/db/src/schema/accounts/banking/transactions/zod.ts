/**
 * Zod schemas for Plaid-shaped `jsonb` on `transaction` / `recurring_stream`.
 * Types are `z.infer` for Drizzle `.$type<>()`; refinements feed `createSelectSchema`.
 */
import { z } from "zod";

/** User-edited category override (`user_override_category`). */
export const userOverrideCategoryJsonSchema = z.object({
  detailed: z.string(),
  primary: z.string(),
});

export type UserOverrideCategoryJson = z.infer<typeof userOverrideCategoryJsonSchema>;

/** User-authored markdown notes (Milkdown). Plain string, capped at 100KB. */
export const transactionNotesMarkdownSchema = z.string().max(100_000);

/**
 * Plaid `location` shape on a transaction (physical merchants; often all-null online).
 * Exported as a raw refinement object — consumers in API/zero packages assemble it
 * into a `z.object(...)` themselves so `.openapi(...)` chains run under the patched
 * `z` from `@hono/zod-openapi`. See institutions/_shared/schema.ts for the pattern.
 */
export const locationJsonbShape = {
  address: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  postal_code: z.string().nullable(),
  region: z.string().nullable(),
  store_number: z.string().nullable(),
} as const;

export type LocationJson = {
  [K in keyof typeof locationJsonbShape]: z.infer<(typeof locationJsonbShape)[K]>;
};

/** Plaid counterparty `type` enum values. */
export const transactionCounterpartyTypeSchema = z.enum([
  "merchant",
  "financial_institution",
  "payment_app",
  "marketplace",
  "payment_terminal",
  "income_source",
]);

export type TransactionCounterpartyType = z.infer<typeof transactionCounterpartyTypeSchema>;

/** Plaid `NumbersIBANNullable` — effectively an empty object in practice. */
export const numbersIbanNullableJsonSchema = z.object({}).strict();

export type NumbersIbanNullableJson = z.infer<typeof numbersIbanNullableJsonSchema>;

export const counterpartyNumbersInternationalJsonSchema = z.object({
  bic: z.string().nullable().optional(),
  iban: numbersIbanNullableJsonSchema.nullable().optional(),
});

export type CounterpartyNumbersInternationalJson = z.infer<
  typeof counterpartyNumbersInternationalJsonSchema
>;

export const counterpartyNumbersBacsJsonSchema = z.object({
  account: z.string().nullable().optional(),
  sort_code: z.string().nullable().optional(),
});

export type CounterpartyNumbersBacsJson = z.infer<typeof counterpartyNumbersBacsJsonSchema>;

export const counterpartyNumbersJsonSchema = z.object({
  bacs: counterpartyNumbersBacsJsonSchema.nullable().optional(),
  international: counterpartyNumbersInternationalJsonSchema.nullable().optional(),
});

export type CounterpartyNumbersJson = z.infer<typeof counterpartyNumbersJsonSchema>;

/**
 * Plaid `counterparties[]` element shape. Exported as a raw refinement object — see
 * `locationJsonbShape` above for rationale.
 */
export const transactionCounterpartyJsonbShape = {
  account_numbers: counterpartyNumbersJsonSchema.nullable().optional(),
  confidence_level: z.string().nullable().optional(),
  entity_id: z.string().nullable().optional(),
  logo_url: z.string().nullable(),
  name: z.string(),
  type: transactionCounterpartyTypeSchema,
  website: z.string().nullable(),
} as const;

export type TransactionCounterpartyJson = {
  [K in keyof typeof transactionCounterpartyJsonbShape]: z.infer<
    (typeof transactionCounterpartyJsonbShape)[K]
  >;
};

export const counterpartiesArrayJsonSchema = z
  .array(z.object(transactionCounterpartyJsonbShape))
  .nullable();

export type CounterpartiesArrayJson = z.infer<typeof counterpartiesArrayJsonSchema>;

/** `transaction_ids` on `recurring_stream` (non-null array of Plaid transaction ids). */
export const recurringTransactionIdsJsonSchema = z.array(z.string());

export type RecurringTransactionIdsJson = z.infer<typeof recurringTransactionIdsJsonSchema>;

/** Refinements for `createSelectSchema(transaction, …)`. */
export const transactionJsonbSelectRefinements = {
  counterparties: counterpartiesArrayJsonSchema,
} as const;

/** Refinements for `createSelectSchema(recurringStream, …)`. */
export const recurringStreamJsonbSelectRefinements = {
  streamType: z.enum(["inflow", "outflow"]),
  transactionIds: recurringTransactionIdsJsonSchema,
} as const;
