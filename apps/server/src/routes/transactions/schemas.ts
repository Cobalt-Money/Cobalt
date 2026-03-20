import { z } from "@hono/zod-openapi";

import { personalFinanceCategorySchema } from "../../lib/schemas.js";

export const transactionListItemSchema = z.object({
  accountName: z.string(),
  accountType: z.string(),
  amount: z.number(),
  authorizedDate: z.string().nullable(),
  date: z.string(),
  id: z.string().uuid(),
  institutionLogo: z.string().nullable(),
  institutionName: z.string().nullable(),
  institutionUrl: z.string().nullable(),
  location: z.any().nullable(),
  logoUrl: z.string().nullable(),
  merchantName: z.string().nullable(),
  name: z.string(),
  originalDate: z.string(),
  originalName: z.string(),
  pending: z.boolean(),
  personalFinanceCategory: personalFinanceCategorySchema.nullable(),
  plaidAccountId: z.string(),
  userOverrideCategory: personalFinanceCategorySchema.nullable(),
  userOverrideDate: z.string().nullable(),
  userOverrideName: z.string().nullable(),
});

export const recurringStreamSchema = z.object({
  accountName: z.string(),
  accountSubtype: z.string().nullable(),
  accountType: z.string(),
  averageAmount: z.number(),
  description: z.string(),
  firstDate: z.string(),
  frequency: z.string(),
  id: z.string().uuid(),
  institutionLogo: z.string().nullable(),
  institutionName: z.string().nullable(),
  institutionUrl: z.string().nullable(),
  isActive: z.boolean(),
  lastAmount: z.number(),
  lastDate: z.string(),
  merchantName: z.string().nullable(),
  personalFinanceCategory: personalFinanceCategorySchema.nullable(),
  predictedNextDate: z.string().nullable(),
  status: z.string(),
  streamId: z.string(),
  streamType: z.enum(["inflow", "outflow"]),
  transactionIds: z.array(z.string()),
  updatedAt: z.string().nullable(),
});

export const creditSpendingSchema = z.object({
  averageLabel: z.enum(["daily", "weekly", "monthly", "yearly"]),
  averageSpending: z.number(),
  spending: z.array(z.object({ amount: z.number(), date: z.string() })),
  totalSpending: z.number(),
});
