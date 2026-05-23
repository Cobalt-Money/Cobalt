import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import {
  categoryGroupIdSchema,
  successResponseSchema,
} from "@cobalt-web/server-data/categories/_shared";
import { deleteCategoryGroup } from "@cobalt-web/server-data/categories/groups/delete";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../../middleware.js";
import { rethrowAsApiError } from "../_lib.js";

const route = createRoute({
  description:
    "Soft-deletes a custom group. The group must be empty (no active categories). System groups cannot be deleted.",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/groups/{groupId}",
  request: { params: categoryGroupIdSchema },
  responses: {
    200: jsonContent(successResponseSchema, "Group deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Group not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Group has categories or is system-locked"),
    422: validationErrorResponse(categoryGroupIdSchema),
  },
  summary: "Delete category group",
  tags: ["Categories"],
});

export const groupsDeleteRouter = createApp().openapi(route, async (c) => {
  const { groupId } = c.req.valid("param");
  try {
    await deleteCategoryGroup(c.var.user.id, groupId);
    return c.json({ success: true }, 200);
  } catch (error) {
    rethrowAsApiError(error);
  }
});
