import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createCategory, createCategorySchema } from "@cobalt-web/server-data/categories/create";
import {
  categoryResponseSchema,
  getCategoryDetail,
} from "@cobalt-web/server-data/categories/detail";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";
import { rethrowAsApiError } from "./_lib.js";

const route = createRoute({
  description: "Creates a custom category under an existing group.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: {
    body: { content: { "application/json": { schema: createCategorySchema } } },
  },
  responses: {
    201: jsonContent(categoryResponseSchema, "Category created"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Group not found"),
    422: validationErrorResponse(createCategorySchema),
  },
  summary: "Create category",
  tags: ["Categories"],
});

export const createRouter = createApp().openapi(route, async (c) => {
  const body = c.req.valid("json");
  try {
    const { id } = await createCategory(c.var.user.id, body);
    const created = await getCategoryDetail(c.var.user.id, id);
    return c.json(categoryResponseSchema.parse(created), 201);
  } catch (error) {
    rethrowAsApiError(error);
  }
});
