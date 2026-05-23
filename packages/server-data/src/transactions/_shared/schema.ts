import { LOCK_KEY_GUARDED_COLUMNS } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import {
  locationJsonSchema as _locationJsonSchema,
  transactionCounterpartyJsonSchema as _transactionCounterpartyJsonSchema,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { z } from "@hono/zod-openapi";

/**
 * Re-construct via `z.object(shape)` in this module body so the bundler keeps
 * the `.openapi()` call adjacent to a z.object literal — same pattern as every
 * other call site in this package. Shape values still come from the db schema.
 */
export const locationJsonSchema = z
  .object(_locationJsonSchema.shape)
  .openapi("TransactionLocation");

export const transactionCounterpartySchema = z
  .object(_transactionCounterpartyJsonSchema.shape)
  .openapi("TransactionCounterparty");

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

/** Standard JSON body for successful transaction override PATCHes. */
export const successResponseSchema = z.object({
  success: z.boolean(),
});

/** Shared `/{transactionId}` path-param shape (detail, activity, overrides). */
export const transactionIdSchema = z.object({
  transactionId: z.uuid(),
});
