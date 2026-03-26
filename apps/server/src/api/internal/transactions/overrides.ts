import { updateTransactionOverride } from "@cobalt-web/server-data/transactions/mutations";
import {
  personalFinanceCategorySchema,
  successResponse,
  transactionIdParamSchema,
  transactionOverrideDateBodySchema,
  transactionOverrideNameBodySchema,
} from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

const patchCategory = createRoute({
  method: "patch",
  path: "/{transactionId}/category",
  request: {
    body: {
      content: {
        "application/json": {
          schema: personalFinanceCategorySchema,
        },
      },
    },
    params: transactionIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Category updated",
    },
  },
  summary: "Override transaction category",
  tags: ["Transactions"],
});

const deleteCategory = createRoute({
  description: "Resets to Plaid's original category",
  method: "delete",
  path: "/{transactionId}/category",
  request: { params: transactionIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Category reset",
    },
  },
  summary: "Reset transaction category",
  tags: ["Transactions"],
});

const patchDate = createRoute({
  method: "patch",
  path: "/{transactionId}/date",
  request: {
    body: {
      content: {
        "application/json": {
          schema: transactionOverrideDateBodySchema,
        },
      },
    },
    params: transactionIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Date updated",
    },
  },
  summary: "Override transaction date",
  tags: ["Transactions"],
});

const deleteDate = createRoute({
  description: "Resets to Plaid's original date",
  method: "delete",
  path: "/{transactionId}/date",
  request: { params: transactionIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Date reset",
    },
  },
  summary: "Reset transaction date",
  tags: ["Transactions"],
});

const patchName = createRoute({
  method: "patch",
  path: "/{transactionId}/name",
  request: {
    body: {
      content: {
        "application/json": {
          schema: transactionOverrideNameBodySchema,
        },
      },
    },
    params: transactionIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Name updated",
    },
  },
  summary: "Override transaction name",
  tags: ["Transactions"],
});

const deleteName = createRoute({
  description: "Resets to Plaid's original name",
  method: "delete",
  path: "/{transactionId}/name",
  request: { params: transactionIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Name reset",
    },
  },
  summary: "Reset transaction name",
  tags: ["Transactions"],
});

export const overridesRouter = new OpenAPIHono<AppEnv>()
  .openapi(patchCategory, async (c) => {
    const { transactionId } = c.req.valid("param");
    const body = c.req.valid("json");
    await updateTransactionOverride(
      transactionId,
      "userOverrideCategory",
      body
    );
    return c.json({ success: true }, 200);
  })
  .openapi(deleteCategory, async (c) => {
    const { transactionId } = c.req.valid("param");
    await updateTransactionOverride(
      transactionId,
      "userOverrideCategory",
      null
    );
    return c.json({ success: true }, 200);
  })
  .openapi(patchDate, async (c) => {
    const { transactionId } = c.req.valid("param");
    const { date } = c.req.valid("json");
    await updateTransactionOverride(transactionId, "userOverrideDate", date);
    return c.json({ success: true }, 200);
  })
  .openapi(deleteDate, async (c) => {
    const { transactionId } = c.req.valid("param");
    await updateTransactionOverride(transactionId, "userOverrideDate", null);
    return c.json({ success: true }, 200);
  })
  .openapi(patchName, async (c) => {
    const { transactionId } = c.req.valid("param");
    const { name } = c.req.valid("json");
    await updateTransactionOverride(transactionId, "userOverrideName", name);
    return c.json({ success: true }, 200);
  })
  .openapi(deleteName, async (c) => {
    const { transactionId } = c.req.valid("param");
    await updateTransactionOverride(transactionId, "userOverrideName", null);
    return c.json({ success: true }, 200);
  });
