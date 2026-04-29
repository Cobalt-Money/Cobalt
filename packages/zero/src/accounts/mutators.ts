import { defineMutator } from "@rocicorp/zero";
import type { Transaction } from "@rocicorp/zero";
import { z } from "zod";

import type { Context } from "../auth.js";
import type { Schema } from "../schema.js";
import { zql } from "../schema.js";

const ACCOUNT_TYPE = ["depository", "credit", "investment", "loan"] as const;
const MANUAL_SUBTYPES = ["checking", "savings", "cash"] as const;

const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  subtype: z.enum(MANUAL_SUBTYPES).default("cash"),
  type: z.enum(ACCOUNT_TYPE).default("depository"),
});

const accountIdSchema = z.object({ id: z.string().uuid() });

async function assertOwnsManualAccount(
  tx: Transaction<Schema>,
  ctx: Context,
  accountId: string
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

export const accountsMutators = {
  createAccount: defineMutator(
    createAccountSchema,
    async ({ args, ctx, tx }) => {
      if (!ctx?.userId) {
        throw new Error("Unauthorized");
      }
      await tx.mutate.financialAccount.insert({
        id: crypto.randomUUID(),
        name: args.name.trim(),
        source: "manual",
        subtype: args.subtype,
        type: args.type,
        userId: ctx.userId,
      });
    }
  ),

  deleteAccount: defineMutator(accountIdSchema, async ({ args, ctx, tx }) => {
    await assertOwnsManualAccount(tx, ctx, args.id);
    await tx.mutate.financialAccount.delete({ id: args.id });
  }),
};
