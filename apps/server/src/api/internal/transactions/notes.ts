import { updateTransactionOverride } from "@cobalt-web/server-data/transactions/mutations";
import {
  successResponse,
  transactionIdParamSchema,
  transactionNotesBodySchema,
} from "@cobalt-web/server-data/transactions/schemas";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";

import { requirePaidUser } from "../middleware.js";

const patchNotes = createRoute({
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}/notes",
  request: {
    body: {
      content: {
        "application/json": {
          schema: transactionNotesBodySchema,
        },
      },
    },
    params: transactionIdParamSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Notes updated",
    },
  },
  summary: "Update transaction notes",
  tags: ["Transactions"],
});

const deleteNotes = createRoute({
  description: "Clears the notes field (sets to NULL)",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{transactionId}/notes",
  request: { params: transactionIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: successResponse } },
      description: "Notes cleared",
    },
  },
  summary: "Clear transaction notes",
  tags: ["Transactions"],
});

export const notesRouter = new OpenAPIHono<AppEnv>()
  .openapi(patchNotes, async (c) => {
    const { transactionId } = c.req.valid("param");
    const { notes } = c.req.valid("json");
    await updateTransactionOverride(transactionId, "notes", notes);
    return c.json({ success: true }, 200);
  })
  .openapi(deleteNotes, async (c) => {
    const { transactionId } = c.req.valid("param");
    await updateTransactionOverride(transactionId, "notes", null);
    return c.json({ success: true }, 200);
  });
