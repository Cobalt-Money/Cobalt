import { financialAccount } from "@cobalt-web/db/schema/accounts/financial-account";
import { snapshot } from "@cobalt-web/db/schema/accounts/snapshot";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

const snapshotRowSchema = createSelectSchema(snapshot);
const financialAccountRowSchema = createSelectSchema(financialAccount);

export const balanceSnapshotQuerySchema = z.object({
  accountId: z.string().optional(),
  endDate: z.string().optional(),
  startDate: z.string().optional(),
});

export const errorResponseSchema = z.object({
  code: z.string().optional(),
  error: z.string(),
});

export const balanceSnapshotSchema = z.object({
  accountName: financialAccountRowSchema.shape.name,
  accountSubtype: financialAccountRowSchema.shape.subtype,
  accountType: financialAccountRowSchema.shape.type,
  availableBalance: z.number().nullable(),
  /** ISO string. */
  createdAt: z.string(),
  creditLimit: z.number().nullable(),
  currentBalance: z.number(),
  id: snapshotRowSchema.shape.id,
  institutionName: financialAccountRowSchema.shape.institutionName,
  /** Provider-external account id. Null for `manual` accounts. */
  plaidAccountId: z.string().nullable(),
  snapshotDate: snapshotRowSchema.shape.snapshotDate,
});

export const balanceSnapshotListResponseSchema = z.object({
  snapshots: z.array(balanceSnapshotSchema),
});

export type BalanceSnapshotQuery = z.infer<typeof balanceSnapshotQuerySchema>;
export type BalanceSnapshot = z.infer<typeof balanceSnapshotSchema>;
