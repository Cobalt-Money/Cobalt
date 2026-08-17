import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";
import { listFiles } from "./_shared/service.js";
import type { WorkspaceFilesDependencies } from "./_shared/service.js";
import { filesResponseSchema, workspaceParamsSchema } from "./_shared/schemas.js";

const route = createRoute({
  description: "List file references scoped to the authenticated user and workspace.",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{workspaceId}/files",
  request: { params: workspaceParamsSchema },
  responses: {
    200: jsonContent(filesResponseSchema, "Workspace files"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Workspace not found"),
    422: validationErrorResponse(workspaceParamsSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Workspace metadata unavailable"),
  },
  summary: "List workspace files",
  tags: ["Workspace files"],
});

const buildRouter = (dependencies: WorkspaceFilesDependencies) =>
  createApp().openapi(route, async (c) => {
    const { workspaceId } = c.req.valid("param");
    const files = await listFiles(dependencies, c.var.user.id, workspaceId);
    return c.json(filesResponseSchema.parse({ files }), 200);
  });

export const createListRouter = (
  dependencies: WorkspaceFilesDependencies,
): ReturnType<typeof buildRouter> => buildRouter(dependencies);
