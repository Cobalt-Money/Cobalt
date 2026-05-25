import { LOCK_KEY_GUARDED_COLUMNS } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import {
  locationJsonbShape,
  transactionCounterpartyJsonbShape,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { z } from "@hono/zod-openapi";

/**
 * Assemble jsonb schemas from raw shape objects exported by db. Building the
 * `z.object(...)` here (not in db) ensures the `.openapi(...)` chain runs under
 * the patched `z` from `@hono/zod-openapi`. Mirrors the institutions pattern.
 */
export const locationJsonSchema = z.object(locationJsonbShape).openapi("TransactionLocation");

export const transactionCounterpartySchema = z
  .object(transactionCounterpartyJsonbShape)
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
