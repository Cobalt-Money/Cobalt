import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { successResponseSchema } from "@cobalt-web/server-data/categories/_shared";
import {
  reorderCategories,
  reorderCategoriesSchema,
} from "@cobalt-web/server-data/categories/reorder";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";
import { rethrowAsApiError } from "./_lib.js";

const route = createRoute({
  description: "Replaces the order of categories within a single group.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/reorder",
  request: {
    body: {
      content: { "application/json": { schema: reorderCategoriesSchema } },
    },
  },
  responses: {
    200: jsonContent(successResponseSchema, "Reordered"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Group not found"),
    422: validationErrorResponse(reorderCategoriesSchema),
  },
  summary: "Reorder categories",
  tags: ["Categories"],
});

export const reorderRouter = createApp().openapi(route, async (c) => {
  const body = c.req.valid("json");
  try {
    await reorderCategories(c.var.user.id, body);
    return c.json({ success: true }, 200);
  } catch (error) {
    rethrowAsApiError(error);
  }
});
