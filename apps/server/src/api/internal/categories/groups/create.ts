import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  createCategoryGroup,
  createCategoryGroupSchema,
} from "@cobalt-web/server-data/categories/groups/create";
import {
  categoryGroupResponseSchema,
  getCategoryGroupDetail,
} from "@cobalt-web/server-data/categories/groups/detail";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "Creates a custom category group.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/groups",
  request: {
    body: { content: { "application/json": { schema: createCategoryGroupSchema } } },
  },
  responses: {
    201: jsonContent(categoryGroupResponseSchema, "Group created"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(createCategoryGroupSchema),
  },
  summary: "Create category group",
  tags: ["Categories"],
});

export const groupsCreateRouter = createApp().openapi(route, async (c) => {
  const body = c.req.valid("json");
  const { id } = await createCategoryGroup(c.var.user.id, body);
  const created = await getCategoryGroupDetail(c.var.user.id, id);
  return c.json(categoryGroupResponseSchema.parse(created), 201);
});
