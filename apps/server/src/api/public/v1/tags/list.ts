import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createTag } from "@cobalt-web/server-data/transactions/tags/mutations";
import { getTag, listTags } from "@cobalt-web/server-data/transactions/tags/queries";
import { createTagSchema } from "@cobalt-web/server-data/transactions/tags/schemas";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";
import { tagSchema } from "../schemas.js";

const tagsResponseSchema = z.object({ data: z.array(tagSchema) }).openapi("TagList");
const tagResponseSchema = z.object({ data: tagSchema }).openapi("TagDetail");

const listTagsRoute = createRoute({
  description: "List every tag owned by the authenticated user.",
  method: "get",
  middleware: [requireApiKey] as const,
  path: "/tags",
  responses: {
    200: jsonContent(tagsResponseSchema, "Tags owned by the authenticated user"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
  },
  security: [{ bearerAuth: [] }],
  summary: "List tags",
  tags: ["Tags"],
});

const createTagRoute = createRoute({
  description: "Create a new tag. Names must be unique per user (case-insensitive).",
  method: "post",
  middleware: [requireApiKey] as const,
  path: "/tags",
  request: { body: jsonContent(createTagSchema, "Tag to create") },
  responses: {
    201: jsonContent(tagResponseSchema, "Created tag"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    409: jsonContent(errorResponseWithCodeSchema, "A tag with that name already exists"),
    422: validationErrorResponse(createTagSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Create tag",
  tags: ["Tags"],
});

export const listRouter = createApp()
  .openapi(listTagsRoute, async (c) => {
    const { user } = c.var;
    const rows = await listTags(user.id);
    return c.json({ data: z.array(tagSchema).parse(rows) }, 200);
  })
  .openapi(createTagRoute, async (c) => {
    const { user } = c.var;
    const body = c.req.valid("json");
    const { id } = await createTag(user.id, body);
    const tag = await getTag(user.id, id);
    if (!tag) {
      throw new Error(`Tag ${id} missing immediately after create`);
    }
    return c.json({ data: tagSchema.parse(tag) }, 201);
  });
