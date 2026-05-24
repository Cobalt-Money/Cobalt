import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createManualTransactions } from "@cobalt-web/server-data/transactions/create";
import { getTransactionDetail } from "@cobalt-web/server-data/transactions/detail";
import { getTransactions } from "@cobalt-web/server-data/transactions/list";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { transactionSchema } from "../schemas.js";
import { toTransaction, transactionResponseSchema } from "./_shared.js";

const getTransactionsSchema = z.object({
  accountId: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .openapi({
      description:
        "Restrict to one or more account ids. Repeat the param (`?accountId=a&accountId=b`) for multiple.",
    }),
  cursor: z.string().optional().openapi({
    description: "Opaque cursor returned by the previous page. Omit for first page.",
  }),
  endDate: z.string().optional().openapi({ example: "2026-05-22" }),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  startDate: z.string().optional().openapi({ example: "2026-01-01" }),
});

const transactionsResponseSchema = z
  .object({
    data: z.array(transactionSchema),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  })
  .openapi("TransactionList");

const createTransactionSchema = z
  .object({
    accountId: z.string().openapi({
      description: "Account to attach this transaction to. Must be a manual account.",
    }),
    amount: z.number().openapi({
      description: "Positive = money out (spending), negative = money in (refund/income).",
    }),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .openapi({ example: "2026-05-22" }),
    merchantName: z.string().min(1).max(255).optional(),
    name: z.string().min(1).max(255).openapi({ description: "Transaction description." }),
    notes: z.string().max(2000).optional().openapi({ description: "Free-form notes." }),
  })
  .openapi("TransactionCreate");

const listTransactionsRoute = createRoute({
  description:
    "Returns transactions across all of the user's accounts, newest first. Use `nextCursor` to page.",
  method: "get",
  middleware: [requireApiKey] as const,
  path: "/transactions",
  request: { query: getTransactionsSchema },
  responses: {
    200: jsonContent(transactionsResponseSchema, "Paginated transactions"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    422: validationErrorResponse(getTransactionsSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "List transactions",
  tags: ["Transactions"],
});

const createTransactionRoute = createRoute({
  description:
    "Add a manual transaction. The target `accountId` must reference a manual (not bank-synced) account.",
  method: "post",
  middleware: [requireApiKey] as const,
  path: "/transactions",
  request: {
    body: jsonContent(createTransactionSchema, "Transaction to create"),
  },
  responses: {
    201: jsonContent(transactionResponseSchema, "Created transaction"),
    400: jsonContent(errorResponseWithCodeSchema, "Target account is not manual or does not exist"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    422: validationErrorResponse(createTransactionSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Create transaction",
  tags: ["Transactions"],
});

export const listRouter = createApp()
  .openapi(listTransactionsRoute, async (c) => {
    const { user } = c.var;
    const q = c.req.valid("query");
    const accountIds = q.accountId
      ? new Set(Array.isArray(q.accountId) ? q.accountId : [q.accountId])
      : null;
    const result = await getTransactions(user.id, {
      cursor: q.cursor,
      endDate: q.endDate,
      limit: q.limit,
      startDate: q.startDate,
    });
    return c.json(
      transactionsResponseSchema.parse({
        data: result.transactions
          .filter((t) => !accountIds || accountIds.has(t.accountId))
          .map(toTransaction),
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      }),
      200,
    );
  })
  .openapi(createTransactionRoute, async (c) => {
    const { user } = c.var;
    const body = c.req.valid("json");
    try {
      const { ids } = await createManualTransactions(user.id, [
        {
          ...body,
          currency: null,
          merchantName: body.merchantName ?? null,
          website: null,
        },
      ]);
      const [newId] = ids;
      if (!newId) {
        throw new Error("createManualTransactions returned no id");
      }
      const tx = await getTransactionDetail(user.id, newId);
      return c.json(transactionResponseSchema.parse({ data: toTransaction(tx) }), 201);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        return c.json({ code: error.code, error: error.message }, 400);
      }
      throw error;
    }
  });
