import { LOCK_KEY_GUARDED_COLUMNS } from "@cobalt-web/db/schema/accounts/banking/transactions/transaction-edit";
import {
  locationJsonSchema as _locationJsonSchema,
  transactionCounterpartyJsonSchema as _transactionCounterpartyJsonSchema,
} from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { z } from "@hono/zod-openapi";

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

/** Standard JSON body for successful transaction override PATCHes. */
export const successResponseSchema = z.object({
  success: z.boolean(),
});

/** Shared `/{transactionId}` path-param shape (detail, activity, overrides). */
export const transactionIdSchema = z.object({
  transactionId: z.uuid(),
});
