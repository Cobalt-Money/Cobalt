import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { bulkApplyTags } from "@cobalt-web/server-data/transactions/tags/mutations";
import { bulkApplyTagsSchema } from "@cobalt-web/server-data/transactions/tags/schemas";
import { createRoute, z } from "@hono/zod-openapi";

import { createApp } from "../../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../../lib/openapi-helpers.js";
import { requireApiKey } from "../middleware/require-api-key.js";

const responseSchema = z
  .object({
    success: z.boolean(),
    updatedCount: z.number().int(),
  })
  .openapi("TagsBulkApplyResponse");

const route = createRoute({
  description: "Add and/or remove tags across many transactions in one call.",
  method: "post",
  middleware: [requireApiKey] as const,
  operationId: "tags_bulkApply",
  path: "/tags/bulk-apply",
  request: { body: jsonContentRequired(bulkApplyTagsSchema, "Transactions + tag add/remove sets") },
  responses: {
    200: jsonContent(responseSchema, "Bulk apply complete"),
    401: jsonContent(errorResponseWithCodeSchema, "Missing or invalid API key"),
    404: jsonContent(errorResponseWithCodeSchema, "One or more tags not found"),
    422: validationErrorResponse(bulkApplyTagsSchema),
  },
  security: [{ bearerAuth: [] }],
  summary: "Bulk apply tags",
  tags: ["Tags"],
});

export const bulkApplyRouter = createApp().openapi(route, async (c) => {
  const { user } = c.var;
  const body = c.req.valid("json");
  try {
    const { updatedCount } = await bulkApplyTags(user.id, body);
    return c.json({ success: true, updatedCount }, 200);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return c.json({ code: error.code, error: error.message }, 404);
    }
    throw error;
  }
});
