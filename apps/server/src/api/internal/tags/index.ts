import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { successResponseSchema } from "@cobalt-web/server-data/transactions/_shared";
import {
  bulkApplyTags,
  createTag,
  deleteTag,
  updateTag,
} from "@cobalt-web/server-data/transactions/tags/mutations";
import { getTag, listTags } from "@cobalt-web/server-data/transactions/tags/queries";
import {
  bulkApplyTagsSchema,
  createTagResponseSchema,
  createTagSchema,
  patchTagSchema,
  tagIdSchema,
  tagsListResponseSchema,
} from "@cobalt-web/server-data/transactions/tags/schemas";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requirePaidUser } from "../middleware.js";

const listTagsRoute = createRoute({
  description: "Lists every tag the user owns (active + archived) with usage counts.",
  method: "get",
  middleware: [requirePaidUser] as const,
  path: "/",
  responses: {
    200: jsonContent(tagsListResponseSchema, "User's tags"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
  },
  summary: "List tags",
  tags: ["Tags"],
});

const createTagRoute = createRoute({
  description: "Creates a new tag scoped to the calling user.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/",
  request: {
    body: {
      content: { "application/json": { schema: createTagSchema } },
    },
  },
  responses: {
    201: jsonContent(createTagResponseSchema, "Tag created"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    422: validationErrorResponse(createTagSchema),
  },
  summary: "Create tag",
  tags: ["Tags"],
});

const updateTagRoute = createRoute({
  description: "Renames, recolors, or archives/unarchives a tag.",
  method: "patch",
  middleware: [requirePaidUser] as const,
  path: "/{tagId}",
  request: {
    body: { content: { "application/json": { schema: patchTagSchema } } },
    params: tagIdSchema,
  },
  responses: {
    200: jsonContent(successResponseSchema, "Tag updated"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Tag not found"),
    422: validationErrorResponse(patchTagSchema),
  },
  summary: "Update tag",
  tags: ["Tags"],
});

const deleteTagRoute = createRoute({
  description: "Permanently deletes a tag and all its transaction memberships (cascade).",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{tagId}",
  request: { params: tagIdSchema },
  responses: {
    200: jsonContent(successResponseSchema, "Tag deleted"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "Tag not found"),
    422: validationErrorResponse(tagIdSchema),
  },
  summary: "Delete tag",
  tags: ["Tags"],
});

const bulkApplyRoute = createRoute({
  description: "Adds and/or removes tags across many transactions in a single operation.",
  method: "post",
  middleware: [requirePaidUser] as const,
  path: "/bulk-apply",
  request: {
    body: {
      content: { "application/json": { schema: bulkApplyTagsSchema } },
    },
  },
  responses: {
    200: jsonContent(
      z.object({
        success: z.boolean(),
        updatedCount: z.number().int(),
      }),
      "Bulk apply complete",
    ),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    403: jsonContent(errorResponseWithCodeSchema, "Subscription required"),
    404: jsonContent(errorResponseWithCodeSchema, "One or more tags not found"),
    422: validationErrorResponse(bulkApplyTagsSchema),
  },
  summary: "Bulk apply tags",
  tags: ["Tags"],
});

export const tagsRouter = createApp()
  .openapi(listTagsRoute, async (c) => {
    const tags = await listTags(c.var.user.id);
    return c.json({ tags }, 200);
  })
  .openapi(createTagRoute, async (c) => {
    const body = c.req.valid("json");
    const { id } = await createTag(c.var.user.id, body);
    const created = await getTag(c.var.user.id, id);
    if (!created) {
      throw new Error("Tag created but not found");
    }
    return c.json({ tag: created }, 201);
  })
  .openapi(updateTagRoute, async (c) => {
    const { tagId } = c.req.valid("param");
    const body = c.req.valid("json");
    await updateTag(c.var.user.id, tagId, body);
    return c.json({ success: true }, 200);
  })
  .openapi(deleteTagRoute, async (c) => {
    const { tagId } = c.req.valid("param");
    await deleteTag(c.var.user.id, tagId);
    return c.json({ success: true }, 200);
  })
  .openapi(bulkApplyRoute, async (c) => {
    const body = c.req.valid("json");
    const { updatedCount } = await bulkApplyTags(c.var.user.id, body);
    return c.json({ success: true, updatedCount }, 200);
  });
