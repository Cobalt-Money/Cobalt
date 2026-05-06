import { createFileRoute, Outlet } from "@tanstack/react-router";
import { z } from "zod";

const amountSchema = z.enum(["all", "income", "expense"]).optional();
const statusSchema = z.enum(["all", "pending", "posted"]).optional();
const bankSchema = z.array(z.string()).optional();
const amountBoundSchema = z.number().nonnegative().optional();
const tagIdsSchema = z.array(z.uuid()).optional();
const categoryIdsSchema = z.array(z.uuid()).optional();

const transactionsSearchSchema = z.object({
  amount: amountSchema,
  amountMax: amountBoundSchema,
  amountMin: amountBoundSchema,
  bank: bankSchema,
  categoryIds: categoryIdsSchema,
  status: statusSchema,
  tagIds: tagIdsSchema,
});

export type TransactionsSearch = z.infer<typeof transactionsSearchSchema>;

export const Route = createFileRoute("/_auth/transactions")({
  component: () => <Outlet />,
  validateSearch: transactionsSearchSchema,
});
