import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { categoryIdSchema } from "@cobalt-web/server-data/categories/_shared";
import {
  categoryResponseSchema,
  getCategoryDetail,
} from "@cobalt-web/server-data/categories/detail";
import { hideCategory, hideCategorySchema } from "@cobalt-web/server-data/categories/hide";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";
import { rethrowAsApiError } from "./_lib.js";

const route = createRoute({
  description:
    "Hides a category. Optionally reassigns dependent transactions and recurring rows to a target cat first; otherwise leaves them assigned to the now-hidden cat.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/{categoryId}/hide",
  request: {
    body: { content: { "application/json": { schema: hideCategorySchema } } },
    params: categoryIdSchema,
  },
  responses: {
    200: jsonContent(categoryResponseSchema, "Category hidden"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Category or reassign target not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Reassign target invalid"),
    422: validationErrorResponse(hideCategorySchema),
  },
  summary: "Hide category",
  tags: ["Categories"],
});

export const hideRouter = createApp().openapi(route, async (c) => {
  const { categoryId } = c.req.valid("param");
  const body = c.req.valid("json");
  try {
    await hideCategory(c.var.user.id, categoryId, body);
    const updated = await getCategoryDetail(c.var.user.id, categoryId);
    return c.json(categoryResponseSchema.parse(updated), 200);
  } catch (error) {
    rethrowAsApiError(error);
  }
});
