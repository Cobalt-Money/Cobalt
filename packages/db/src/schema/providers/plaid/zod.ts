/**
 * Zod schemas for `jsonb` columns on `plaid_connection` and `institution`.
 * Types are `z.infer` for Drizzle `.$type<>()`; refinements feed `createSelectSchema`.
 */
import { z } from "zod";

/** Nullable string array — `institution.routing_numbers`, `plaid_connection.{available_products,billed_products}`. */
export const stringArrayJsonSchema = z.array(z.string()).nullable();

export type StringArrayJson = z.infer<typeof stringArrayJsonSchema>;

/**
 * Plaid item error — loosely typed since Plaid's `PlaidError` shape varies.
 * Kept as `unknown` since we only check presence (not shape) in application code.
 */
export const plaidItemErrorJsonSchema = z.unknown().nullable();

export type PlaidItemErrorJson = z.infer<typeof plaidItemErrorJsonSchema>;

/** Refinements for `createSelectSchema(plaidConnection, …)`. */
export const plaidConnectionJsonbSelectRefinements = {
  availableProducts: stringArrayJsonSchema,
  billedProducts: stringArrayJsonSchema,
  error: plaidItemErrorJsonSchema,
} as const;

/** Refinements for `createSelectSchema(institution, …)`. */
export const institutionJsonbSelectRefinements = {
  routingNumbers: stringArrayJsonSchema,
} as const;
