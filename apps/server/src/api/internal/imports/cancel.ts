import { requestCancel } from "@cobalt-web/server-data/import/shared/mutations";
import {
  importJobIdParamSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/import/shared/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";

const route = createRoute({
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{id}/cancel",
  request: { params: importJobIdParamSchema },
  responses: { 200: jsonContent(successResponseSchema, "Cancellation requested") },
  summary: "Cancel an in-progress commit",
  tags: ["Imports"],
});

export const importsCancelRouter = createApp().openapi(route, async (c) => {
  const { id } = c.req.valid("param");
  await requestCancel(c.var.user.id, id);
  return c.json({ message: "Cancel requested", success: true }, 200);
});
