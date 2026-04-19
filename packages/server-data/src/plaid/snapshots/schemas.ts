import {
  bankAccount,
  bankBalanceSnapshot,
  bankConnection,
  bankConnectionJsonbSelectRefinements,
} from "@cobalt-web/db/schema/banking";
import { z } from "@hono/zod-openapi";
import { createSelectSchema } from "drizzle-orm/zod";

const bankBalanceSnapshotRowSchema = createSelectSchema(bankBalanceSnapshot);
const bankAccountRowSchema = createSelectSchema(bankAccount);
const bankConnectionRowSchema = createSelectSchema(bankConnection, {
  ...bankConnectionJsonbSelectRefinements,
});

export const balanceSnapshotQuerySchema = z.object({
  accountId: z.string().optional(),
  endDate: z.string().optional(),
  startDate: z.string().optional(),
});

export const errorResponseSchema = z.object({
  code: z.string().optional(),
  error: z.string(),
});

/** Joined DTO: snapshot columns + account/connection fields + ISO `createdAt` on the wire. */
const balanceSnapshotSnapshotSlice = bankBalanceSnapshotRowSchema.pick({
  availableBalance: true,
  creditLimit: true,
  currentBalance: true,
  id: true,
  plaidAccountId: true,
  snapshotDate: true,
  snapshotSource: true,
});

export const balanceSnapshotSchema = balanceSnapshotSnapshotSlice.extend({
  accountName: bankAccountRowSchema.shape.name,
  accountSubtype: bankAccountRowSchema.shape.subtype,
  accountType: bankAccountRowSchema.shape.type,
  /** ISO string; overrides timestamp column inference from `bank_balance_snapshot`. */
  createdAt: z.string(),
  institutionName: bankConnectionRowSchema.shape.institutionName,
});

export const balanceSnapshotListResponseSchema = z.object({
  snapshots: z.array(balanceSnapshotSchema),
});

export type BalanceSnapshotQuery = z.infer<typeof balanceSnapshotQuerySchema>;
export type BalanceSnapshot = z.infer<typeof balanceSnapshotSchema>;
