import { z } from "@hono/zod-openapi";

/**
 * Set a manual account's `balance.current` directly. Value is signed and
 * written as-is — caller controls the sign (e.g. positive for an asset,
 * negative for a liability).
 */
export const patchManualBalanceSchema = z
  .object({
    current: z
      .number()
      .refine((v) => Number.isFinite(v), { message: "must be finite" })
      .refine((v) => Math.round(v * 10_000) === v * 10_000, {
        message: "max 4 decimal places (numeric(19,4))",
      })
      .openapi({
        description:
          "New signed balance to write to balance.current. Stored verbatim; caller decides sign. Up to 4 decimal places.",
      }),
  })
  .openapi("PatchManualBalance");

export type PatchManualBalance = z.infer<typeof patchManualBalanceSchema>;
