/**
 * Zod schemas for `jsonb` columns on `plaid_connection`.
 * Types are `z.infer` for Drizzle `.$type<>()`; refinements feed `createSelectSchema`.
 */
import { z } from "zod";

import { stringArrayJsonSchema } from "../../banking/items/zod";

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
