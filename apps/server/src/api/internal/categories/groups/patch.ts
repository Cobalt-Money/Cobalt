import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { categoryGroupIdSchema } from "@cobalt-web/server-data/categories/_shared";
import {
  categoryGroupResponseSchema,
  getCategoryGroupDetail,
} from "@cobalt-web/server-data/categories/groups/detail";
import {
  patchCategoryGroup,
  patchCategoryGroupSchema,
} from "@cobalt-web/server-data/categories/groups/patch";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";

const route = createRoute({
  description: "Renames or reorders a category group.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/groups/{groupId}",
  request: {
    body: { content: { "application/json": { schema: patchCategoryGroupSchema } } },
    params: categoryGroupIdSchema,
  },
  responses: {
    200: jsonContent(categoryGroupResponseSchema, "Group updated"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Group not found"),
    422: validationErrorResponse(patchCategoryGroupSchema),
  },
  summary: "Update category group",
  tags: ["Categories"],
});

export const groupsPatchRouter = createApp().openapi(route, async (c) => {
  const { groupId } = c.req.valid("param");
  const body = c.req.valid("json");
  await patchCategoryGroup(c.var.user.id, groupId, body);
  const updated = await getCategoryGroupDetail(c.var.user.id, groupId);
  return c.json(categoryGroupResponseSchema.parse(updated), 200);
});
