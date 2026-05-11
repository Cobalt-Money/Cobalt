import {
  bulkApplyTags,
  createTag,
  deleteTag,
  updateTag,
} from "@cobalt-web/server-data/transactions/tags/mutations";
import { getTag, listTags } from "@cobalt-web/server-data/transactions/tags/queries";
import {
  bulkApplyTagsBodySchema,
  createTagBodySchema,
  createTagResponseSchema,
  tagIdParamSchema,
  tagsListResponseSchema,
  tagSuccessResponse,
  updateTagBodySchema,
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
      content: { "application/json": { schema: createTagBodySchema } },
    },
  },
  responses: {
    201: jsonContent(createTagResponseSchema, "Tag created"),
    422: validationErrorResponse(createTagBodySchema),
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
    body: { content: { "application/json": { schema: updateTagBodySchema } } },
    params: tagIdParamSchema,
  },
  responses: {
    200: jsonContent(tagSuccessResponse, "Tag updated"),
    422: validationErrorResponse(updateTagBodySchema),
  },
  summary: "Update tag",
  tags: ["Tags"],
});

const deleteTagRoute = createRoute({
  description: "Permanently deletes a tag and all its transaction memberships (cascade).",
  method: "delete",
  middleware: [requirePaidUser] as const,
  path: "/{tagId}",
  request: { params: tagIdParamSchema },
  responses: {
    200: jsonContent(tagSuccessResponse, "Tag deleted"),
    422: validationErrorResponse(tagIdParamSchema),
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
      content: { "application/json": { schema: bulkApplyTagsBodySchema } },
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
    422: validationErrorResponse(bulkApplyTagsBodySchema),
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
