import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { deleteTag, updateTag } from "@cobalt-web/server-data/transactions/tags/mutations";
import { getTag } from "@cobalt-web/server-data/transactions/tags/queries";
import { patchTagSchema, tagIdSchema } from "@cobalt-web/server-data/transactions/tags/schemas";
import { createRoute } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { tagSchema } from "../schemas.js";

const tagResponseSchema = tagSchema.openapi("TagDetail");

const getTagRoute = createRoute({
  description: "Fetch a single tag by identifier.",
  method: "get",
  middleware: [requireApiKey] as const,
  operationId: "tags_get",
  path: "/tags/{tagId}",
  request: { params: tagIdSchema },
  responses: {
    200: jsonContent(tagResponseSchema, "Tag detail"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Tag not found"),
    422: validationErrorResponse(tagIdSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Get tag",
  tags: ["Tags"],
});

const patchTagRoute = createRoute({
  description: "Update name, color, or archived state of a tag.",
  method: "patch",
  middleware: [requireApiKey] as const,
  operationId: "tags_update",
  path: "/tags/{tagId}",
  request: {
    body: jsonContentRequired(patchTagSchema, "Fields to update"),
    params: tagIdSchema,
  },
  responses: {
    200: jsonContent(tagResponseSchema, "Updated tag"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Tag not found"),
    422: validationErrorResponse(patchTagSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Update tag",
  tags: ["Tags"],
});

const deleteTagRoute = createRoute({
  description: "Permanently delete a tag and detach it from all transactions.",
  method: "delete",
  middleware: [requireApiKey] as const,
  operationId: "tags_delete",
  path: "/tags/{tagId}",
  request: { params: tagIdSchema },
  responses: {
    204: { description: "Tag deleted" },
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "Tag not found"),
    422: validationErrorResponse(tagIdSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Delete tag",
  tags: ["Tags"],
});

export const detailRouter = createApp()
  .openapi(getTagRoute, async (c) => {
    const { user } = c.var;
    const { tagId } = c.req.valid("param");
    const tag = await getTag(user.id, tagId);
    if (!tag) {
      return c.json({ code: "tag_not_found", error: "Tag not found" }, 404);
    }
    return c.json(tagSchema.parse(tag), 200);
  })
  .openapi(patchTagRoute, async (c) => {
    const { user } = c.var;
    const { tagId } = c.req.valid("param");
    const body = c.req.valid("json");
    await updateTag(user.id, tagId, body);
    const tag = await getTag(user.id, tagId);
    if (!tag) {
      return c.json({ code: "tag_not_found", error: "Tag not found" }, 404);
    }
    return c.json(tagSchema.parse(tag), 200);
  })
  .openapi(deleteTagRoute, async (c) => {
    const { user } = c.var;
    const { tagId } = c.req.valid("param");
    await deleteTag(user.id, tagId);
    return c.body(null, 204);
  });
