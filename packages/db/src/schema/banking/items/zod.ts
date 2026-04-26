/**
 * Zod schemas for `jsonb` columns on `institution`.
 * Types are `z.infer` for Drizzle `.$type<>()`; refinements feed `createSelectSchema`.
 */
import { z } from "zod";

/** Nullable string array — used for `routing_numbers` here, and `available_products` / `billed_products` on `plaid_connection`. */
export const stringArrayJsonSchema = z.array(z.string()).nullable();

export type StringArrayJson = z.infer<typeof stringArrayJsonSchema>;

/** Refinements for `createSelectSchema(institution, …)`. */
export const institutionJsonbSelectRefinements = {
  routingNumbers: stringArrayJsonSchema,
} as const;
