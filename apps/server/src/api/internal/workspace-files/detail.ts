import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";
import { readMetadata } from "./_shared/service.js";
import type { WorkspaceFilesDependencies } from "./_shared/service.js";
import { fileParamsSchema, fileResponseSchema } from "./_shared/schemas.js";

const route = createRoute({
  description: "Read one stable workspace file reference without exposing its storage key.",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{workspaceId}/files/{fileId}",
  request: { params: fileParamsSchema },
  responses: {
    200: jsonContent(fileResponseSchema, "Workspace file metadata"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Workspace or file not found"),
    422: validationErrorResponse(fileParamsSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Workspace metadata unavailable"),
  },
  summary: "Read workspace file metadata",
  tags: ["Workspace files"],
});

const buildRouter = (dependencies: WorkspaceFilesDependencies) =>
  createApp().openapi(route, async (c) => {
    const { fileId, workspaceId } = c.req.valid("param");
    const file = await readMetadata(dependencies, c.var.user.id, workspaceId, fileId);
    return c.json(fileResponseSchema.parse({ file }), 200);
  });

export const createDetailRouter = (
  dependencies: WorkspaceFilesDependencies,
): ReturnType<typeof buildRouter> => buildRouter(dependencies);
