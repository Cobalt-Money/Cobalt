import { defineMutator } from "@rocicorp/zero";
import type { Transaction } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import type { Schema } from "../schema.js";
import { zql } from "../schema.js";

const ACCOUNT_TYPE = ["depository", "credit", "investment", "loan"] as const;

const createAccountSchema = z
  .object({
    // Optional client-supplied UUID — lets callers (e.g. the manual investment
    // create flow that immediately posts holdings against the new account)
    // know the id before the server round-trips. Server uses it as-is or
    // generates one if absent.
    accountId: z.string().uuid().optional(),
    creditLimit: z.number().positive().optional(),
    currency: z.string().length(3).default("USD"),
    currentBalance: z.number(),
    logoDomain: z.string().max(253).optional(),
    name: z.string().min(1).max(255),
    subtype: z.string().min(1).max(64),
    type: z.enum(ACCOUNT_TYPE),
  })
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
    const accountId = args.accountId ?? crypto.randomUUID();
    await tx.mutate.financialAccount.insert({
      id: accountId,
      logoDomain: args.logoDomain?.trim() || undefined,
      name: args.name.trim(),
      source: "manual",
      subtype: args.subtype.trim(),
      type: args.type,
      userId: ctx.userId,
    });
    await tx.mutate.balance.insert({
      accountId,
      creditLimit: args.type === "credit" ? args.creditLimit : undefined,
      currency: args.currency,
      current: args.currentBalance,
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
