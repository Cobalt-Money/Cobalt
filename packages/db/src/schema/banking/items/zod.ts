/**
 * Zod schemas for `jsonb` columns on `bank_connection` / `institution`.
 * Types are `z.infer` for Drizzle `.$type<>()`; refinements feed `createSelectSchema`.
 */
import { z } from "zod";

/** Nullable string array — used for `available_products`, `billed_products`, `routing_numbers`. */
export const stringArrayJsonSchema = z.array(z.string()).nullable();

export type StringArrayJson = z.infer<typeof stringArrayJsonSchema>;

/**
 * Plaid item error — loosely typed as Plaid's `PlaidError` shape varies.
 * Kept as `unknown` since we only check presence (not shape) in application code.
 */
export const plaidItemErrorJsonSchema = z.unknown().nullable();

export type PlaidItemErrorJson = z.infer<typeof plaidItemErrorJsonSchema>;

/** Refinements for `createSelectSchema(bankConnection, …)`. */
export const bankConnectionJsonbSelectRefinements = {
  availableProducts: stringArrayJsonSchema,
  billedProducts: stringArrayJsonSchema,
  error: plaidItemErrorJsonSchema,
} as const;

/** Refinements for `createSelectSchema(institution, …)`. */
export const institutionJsonbSelectRefinements = {
  routingNumbers: stringArrayJsonSchema,
} as const;
