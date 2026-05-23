import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  categoryIdSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/categories/_shared";
import { deleteCategory } from "@cobalt-web/server-data/categories/delete";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";
import { rethrowAsApiError } from "./_lib.js";

const route = createRoute({
  description:
    "Soft-deletes a custom category. Reassigns all dependent transactions and recurring rows to the user's Uncategorized seed cat. System cats cannot be deleted (only hidden).",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{categoryId}",
  request: { params: categoryIdSchema },
  responses: {
    200: jsonContent(successResponseSchema, "Category deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Category not found"),
    409: jsonContent(errorResponseWithCodeSchema, "System category cannot be deleted"),
    422: validationErrorResponse(categoryIdSchema),
  },
  summary: "Delete category",
  tags: ["Categories"],
});

export const deleteRouter = createApp().openapi(route, async (c) => {
  const { categoryId } = c.req.valid("param");
  try {
    await deleteCategory(c.var.user.id, categoryId);
    return c.json({ success: true }, 200);
  } catch (error) {
    rethrowAsApiError(error);
  }
});
