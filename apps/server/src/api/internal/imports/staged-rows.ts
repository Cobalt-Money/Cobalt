import { updateStagedRow } from "@cobalt-web/server-data/import/shared/mutations";
import { assertOwnedJob, getStagedRows } from "@cobalt-web/server-data/import/shared/queries";
import {
  importJobIdParamSchema,
  stagedRowsResponseSchema,
  successResponseSchema,
  updateStagedRowBodySchema,
  updateStagedRowParamSchema,
} from "@cobalt-web/server-data/import/shared/schemas";
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
  },
  summary: "All staged rows",
  tags: ["Imports"],
});

const patchRoute = createRoute({
  method: "patch",
  middleware: [requireAuth] as const,
  path: "/{id}/staged-rows/{rowId}",
  request: {
    body: { content: { "application/json": { schema: updateStagedRowBodySchema } } },
    params: updateStagedRowParamSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Staged row updated"),
    404: { description: "Staged row not found" },
  },
  summary: "Patch editable fields on a staged row",
  tags: ["Imports"],
});

export const importsStagedRowsRouter = createApp()
  .openapi(listRoute, async (c) => {
    const { id } = c.req.valid("param");
    await assertOwnedJob(c.var.user.id, id);
    const data = await getStagedRows(id);
    return c.json(data, 200);
  })
  .openapi(patchRoute, async (c) => {
    const { id, rowId } = c.req.valid("param");
    const body = c.req.valid("json");
    const ok = await updateStagedRow(c.var.user.id, id, rowId, body);
    if (!ok) {
      return c.json({ error: "Staged row not found" }, 404);
    }
    return c.json({ success: true }, 200);
  });
