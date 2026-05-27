import { defineMutator } from "@rocicorp/zero";
import type { Transaction } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import type { Schema } from "../schema.js";
import { zql } from "../schema.js";

const ACCOUNT_TYPE = ["depository", "credit", "investment", "loan"] as const;

/**
 * Per-type subtype vocabularies — kept in sync with `MANUAL_SUBTYPES_BY_TYPE`
 * in `@cobalt-web/server-data/accounts/schemas`. Listed inline (not imported)
 * so the Zero schema package stays free of server-only imports.
 */
const MANUAL_SUBTYPES_BY_TYPE = {
  credit: ["credit card", "line of credit"],
  depository: ["checking", "savings", "cash"],
  investment: ["brokerage", "ira", "roth ira", "401k", "hsa", "crypto"],
  loan: ["mortgage", "student", "auto", "personal"],
} as const;
const ALL_MANUAL_SUBTYPE = Object.values(MANUAL_SUBTYPES_BY_TYPE).flat() as [string, ...string[]];

const createAccountSchema = z
  .object({
    creditLimit: z.number().positive().optional(),
    currency: z.string().length(3).default("USD"),
    currentBalance: z.number(),
    logoDomain: z.string().max(253).optional(),
    name: z.string().min(1).max(255),
    subtype: z.enum(ALL_MANUAL_SUBTYPE),
    type: z.enum(ACCOUNT_TYPE),
  })
  .refine(
    (v) =>
      (
        MANUAL_SUBTYPES_BY_TYPE[v.type as keyof typeof MANUAL_SUBTYPES_BY_TYPE] as readonly string[]
      ).includes(v.subtype),
    {
      message: "subtype not valid for this account type",
      path: ["subtype"],
    },
  )
  .refine((v) => v.creditLimit === undefined || v.type === "credit", {
    message: "creditLimit only valid for credit accounts",
    path: ["creditLimit"],
  });

const accountIdSchema = z.object({ id: z.string().uuid() });

const updateAccountNameSchema = z.object({
  customName: z.string().trim().min(1).max(80).nullable(),
  id: z.uuid(),
});

async function assertOwnsManualAccount(
  tx: Transaction<Schema>,
  ctx: Context,
  accountId: string,
): Promise<void> {
  const userId = ctx?.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const row = await tx.run(zql.financialAccount.where("id", accountId).one());
  if (!row || row.userId !== userId) {
    throw new Error("Account not found");
  }
  if (row.source !== "manual") {
    throw new Error("Only manual accounts can be modified via this mutator");
  }
}

async function assertOwnsAccount(
  tx: Transaction<Schema>,
  ctx: Context,
  accountId: string,
): Promise<void> {
  const userId = ctx?.userId;
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const row = await tx.run(zql.financialAccount.where("id", accountId).one());
  if (!row || row.userId !== userId) {
    throw new Error("Account not found");
  }
}

export const accountsMutators = {
  createAccount: defineMutator(createAccountSchema, async ({ args, ctx, tx }) => {
    if (!ctx?.userId) {
      throw new Error("Unauthorized");
    }
    const accountId = crypto.randomUUID();
    await tx.mutate.financialAccount.insert({
      id: accountId,
      logoDomain: args.logoDomain?.trim() || undefined,
      name: args.name.trim(),
      source: "manual",
      subtype: args.subtype.trim(),
      type: args.type,
      userId: ctx.userId,
    });
    // Canonical sign: liabilities stored negative. UI submits positive magnitudes.
    const liability = args.type === "credit" || args.type === "loan";
    const signedCurrent = liability ? -args.currentBalance : args.currentBalance;
    const signedCreditLimit =
      args.type === "credit" && args.creditLimit !== undefined ? -args.creditLimit : undefined;
    await tx.mutate.balance.insert({
      accountId,
      creditLimit: signedCreditLimit,
      currency: args.currency,
      current: signedCurrent,
      id: crypto.randomUUID(),
      userId: ctx.userId,
    });
  }),

  deleteAccount: defineMutator(accountIdSchema, async ({ args, ctx, tx }) => {
    await assertOwnsManualAccount(tx, ctx, args.id);
    await tx.mutate.financialAccount.delete({ id: args.id });
  }),

  updateAccountName: defineMutator(updateAccountNameSchema, async ({ args, ctx, tx }) => {
    await assertOwnsAccount(tx, ctx, args.id);
    const next = args.customName === null ? null : args.customName.trim();
    await tx.mutate.financialAccount.update({
      customName: next && next.length > 0 ? next : null,
      id: args.id,
    });
  }),
};
