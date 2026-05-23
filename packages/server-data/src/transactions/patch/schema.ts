import { transactionNotesMarkdownSchema as notesMarkdownSchema } from "@cobalt-web/db/schema/accounts/banking/transactions/zod";
import { z } from "@hono/zod-openapi";

import { locationJsonSchema } from "../_shared/schema.js";

/**
 * Sparse partial update for a transaction (RFC 7396 semantics):
 * - Omit a field → unchanged.
 * - Non-null value → update column(s), add to lockedFields, append transaction_edit row.
 * - `null` → restore original (from transaction_edit old_value), remove from lockedFields.
 */
export const patchTransactionSchema = z
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

export type PatchTransaction = z.infer<typeof patchTransactionSchema>;
