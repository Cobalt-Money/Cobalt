import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { assertCategoryOwned } from "@cobalt-web/server-data/transactions/_shared";
import { locationJsonSchema } from "@cobalt-web/server-data/transactions/_shared/schema";
import { createManualTransactions } from "@cobalt-web/server-data/transactions/create";
import { getTransactionDetail } from "@cobalt-web/server-data/transactions/detail";
import { getTransactions } from "@cobalt-web/server-data/transactions/list";
import { setTransactionTags } from "@cobalt-web/server-data/transactions/tags/mutations";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../../lib/openapi-helpers.js";
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
      example: "01HX8N7K5Q3M2P9R4V6Y8Z1A2B",
    }),
    amount: z.number().openapi({
      description: "Positive = money out (spending), negative = money in (refund/income).",
      example: 24.5,
    }),
    categoryId: z.uuid().optional().openapi({
      description: "Category id from `GET /v1/categories`. Omit to leave uncategorized.",
      example: "8f3b2a1e-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
    }),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .openapi({ example: "2026-05-22" }),
    location: locationJsonSchema.optional().openapi({
      description:
        "Merchant location. When set, `location` is added to lockedFields so future syncs can't overwrite it.",
    }),
    merchantName: z.string().min(1).max(255).optional().openapi({ example: "Blue Bottle Coffee" }),
    name: z.string().min(1).max(255).openapi({
      description: "Transaction description.",
      example: "Blue Bottle Coffee — Mission",
    }),
    notes: z.string().max(2000).optional().openapi({
      description: "Additional details regarding the transaction. Supports Markdown.",
      example: "**Reimbursable** — paid for team lunch, expense via Expensify",
    }),
    tagIds: z
      .array(z.uuid())
      .optional()
      .openapi({
        description: "Tag ids to attach (from `GET /v1/tags`).",
        example: ["a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"],
      }),
    website: z
      .string()
      .trim()
      .min(3)
      .max(2048)
      .regex(/^[^\s]+\.[^\s]+$/, "must look like a domain or URL")
      .optional()
      .openapi({
        description: "Merchant website. Bare domain or full URL.",
        example: "bluebottlecoffee.com",
      }),
  })
  .openapi("TransactionCreate");

const listTransactionsRoute = createRoute({
  description:
    "Returns transactions across all of the user's accounts, newest first. Use `nextCursor` to page.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "transactions_list",
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
  operationId: "transactions_create",
  path: "/transactions",
  request: {
    body: jsonContentRequired(createTransactionSchema, "Transaction to create"),
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
      if (body.categoryId) {
        await assertCategoryOwned(body.categoryId, user.id);
      }
      const { ids } = await createManualTransactions(user.id, [
        {
          accountId: body.accountId,
          amount: body.amount,
          categoryId: body.categoryId ?? null,
          currency: null,
          date: body.date,
          ...(body.location ? { location: body.location } : {}),
          merchantName: body.merchantName ?? null,
          name: body.name,
          notes: body.notes ?? null,
          website: body.website ?? null,
        },
      ]);
      const [newId] = ids;
      if (!newId) {
        throw new Error("createManualTransactions returned no id");
      }
      if (body.tagIds && body.tagIds.length > 0) {
        await setTransactionTags(user.id, newId, body.tagIds);
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
