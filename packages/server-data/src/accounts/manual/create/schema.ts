import { z } from "@hono/zod-openapi";

/**
 * Per-type subtype vocabularies for MANUAL accounts. Lowercase tokens are the
 * canonical storage form; UI displays via title-casing on the way out.
 */
export const MANUAL_SUBTYPES_BY_TYPE = {
  credit: ["credit card", "line of credit"],
  depository: ["checking", "savings", "cash"],
  investment: ["brokerage", "ira", "roth ira", "401k", "hsa", "crypto"],
  loan: ["mortgage", "student", "auto", "personal"],
} as const;

const ALL_SUBTYPES = Object.values(MANUAL_SUBTYPES_BY_TYPE).flat() as readonly string[];
export type ManualAccountType = keyof typeof MANUAL_SUBTYPES_BY_TYPE;
export type ManualAccountSubtype = (typeof ALL_SUBTYPES)[number];

/**
 * Body for `createManualAccount`. Mirrors the Zero `m.accounts.createAccount`
 * mutator. Strict: `subtype` must be lowercase and must belong to the
 * vocabulary for the chosen `type`. `creditLimit` only valid when
 * `type === "credit"`.
 */
export const createManualAccountSchema = z
  .object({
    creditLimit: z.number().positive().optional(),
    currency: z.string().length(3).default("USD"),
    currentBalance: z.number(),
    logoDomain: z.string().max(253).optional(),
    name: z.string().min(1).max(255),
    subtype: z.enum(ALL_SUBTYPES as [string, ...string[]]),
    type: z.enum(["depository", "credit", "investment", "loan"] as const),
  })
  .refine(
    (v) =>
      (MANUAL_SUBTYPES_BY_TYPE[v.type as ManualAccountType] as readonly string[]).includes(
        v.subtype,
      ),
    {
      message: "subtype not valid for this account type",
      path: ["subtype"],
    },
  )
  .refine((v) => v.creditLimit === undefined || v.type === "credit", {
    message: "creditLimit only valid for credit accounts",
    path: ["creditLimit"],
  });
export type CreateManualAccount = z.infer<typeof createManualAccountSchema>;

export const createManualAccountResponseSchema = z
  .object({
    id: z.string(),
  })
  .openapi("CreateManualAccountResponse");

export type CreateManualAccountResponse = z.infer<typeof createManualAccountResponseSchema>;
