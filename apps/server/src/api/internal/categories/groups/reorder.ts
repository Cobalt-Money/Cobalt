import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { successResponseSchema } from "@cobalt-web/server-data/categories/_shared";
import {
  reorderCategoryGroups,
  reorderCategoryGroupsSchema,
} from "@cobalt-web/server-data/categories/groups/reorder";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "Replaces the order of all groups for the user.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/groups/reorder",
  request: {
    body: { content: { "application/json": { schema: reorderCategoryGroupsSchema } } },
  },
  responses: {
    200: jsonContent(successResponseSchema, "Reordered"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(reorderCategoryGroupsSchema),
  },
  summary: "Reorder category groups",
  tags: ["Categories"],
});

export const groupsReorderRouter = createApp().openapi(route, async (c) => {
  const body = c.req.valid("json");
  await reorderCategoryGroups(c.var.user.id, body);
  return c.json({ success: true }, 200);
});
