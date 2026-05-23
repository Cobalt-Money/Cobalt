import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { updateStagedRow } from "@cobalt-web/server-data/imports/_shared/mutations";
import { assertOwnedJob, getStagedRows } from "@cobalt-web/server-data/imports/_shared/queries";
import {
  importJobIdParamSchema,
  stagedRowResponseSchema,
  stagedRowsResponseSchema,
  updateStagedRowParamSchema,
  updateStagedRowSchema,
} from "@cobalt-web/server-data/imports/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const listRoute = createRoute({
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{id}/staged-rows",
  request: { params: importJobIdParamSchema },
  responses: {
    200: jsonContent(stagedRowsResponseSchema, "Full staged-row set for the expanded table view"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
  },
  summary: "All staged rows",
  tags: ["Imports"],
});

const patchRoute = createRoute({
  method: "patch",
  middleware: [requireAuth] as const,
  path: "/{id}/staged-rows/{rowId}",
  request: {
    body: { content: { "application/json": { schema: updateStagedRowSchema } } },
    params: updateStagedRowParamSchema,
  },
  responses: {
    200: jsonContent(stagedRowResponseSchema, "Updated staged row"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Staged row not found"),
  },
  summary: "Patch editable fields on a staged row",
  tags: ["Imports"],
});

export const importsStagedRowsRouter = createApp()
  .openapi(listRoute, async (c) => {
    const { id } = c.req.valid("param");
    await assertOwnedJob(c.var.user.id, id);
    const data = await getStagedRows(id);
    return c.json(stagedRowsResponseSchema.parse(data), 200);
  })
  .openapi(patchRoute, async (c) => {
    const { id, rowId } = c.req.valid("param");
    const body = c.req.valid("json");
    const row = await updateStagedRow(c.var.user.id, id, rowId, body);
    if (!row) {
      return c.json({ code: "staged_row_not_found", error: "Staged row not found" }, 404);
    }
    return c.json(stagedRowResponseSchema.parse(row), 200);
  });
