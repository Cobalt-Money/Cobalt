import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { categoryIdSchema } from "@cobalt-web/server-data/categories/_shared";
import {
  categoryResponseSchema,
  getCategoryDetail,
} from "@cobalt-web/server-data/categories/detail";
import { patchCategory, patchCategorySchema } from "@cobalt-web/server-data/categories/patch";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";
import { rethrowAsApiError } from "./_lib.js";

const route = createRoute({
  description: "Renames, recolors/icons, hides, reorders, or moves a category between groups.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/{categoryId}",
  request: {
    body: { content: { "application/json": { schema: patchCategorySchema } } },
    params: categoryIdSchema,
  },
  responses: {
    200: jsonContent(categoryResponseSchema, "Category updated"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Category or group not found"),
    422: validationErrorResponse(patchCategorySchema),
  },
  summary: "Update category",
  tags: ["Categories"],
});

export const patchRouter = createApp().openapi(route, async (c) => {
  const { categoryId } = c.req.valid("param");
  const body = c.req.valid("json");
  try {
    await patchCategory(c.var.user.id, categoryId, body);
    const updated = await getCategoryDetail(c.var.user.id, categoryId);
    return c.json(categoryResponseSchema.parse(updated), 200);
  } catch (error) {
    rethrowAsApiError(error);
  }
});
