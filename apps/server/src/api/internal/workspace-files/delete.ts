import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";
import { deleteFile } from "./_shared/service.js";
import type { WorkspaceFilesDependencies } from "./_shared/service.js";
import { fileParamsSchema } from "./_shared/schemas.js";

const route = createRoute({
  description: "Delete object bytes and their authenticated workspace metadata.",
  method: "delete",
  middleware: [requireAuth] as const,
  path: "/{workspaceId}/files/{fileId}",
  request: { params: fileParamsSchema },
  responses: {
    204: { description: "File deleted" },
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Workspace or file not found"),
    422: validationErrorResponse(fileParamsSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Workspace provider unavailable"),
  },
  summary: "Delete workspace file",
  tags: ["Workspace files"],
});

const buildRouter = (dependencies: WorkspaceFilesDependencies) =>
  createApp().openapi(route, async (c) => {
    const { fileId, workspaceId } = c.req.valid("param");
    await deleteFile(dependencies, c.var.user.id, workspaceId, fileId);
    return c.body(null, 204);
  });

export const createDeleteRouter = (
  dependencies: WorkspaceFilesDependencies,
): ReturnType<typeof buildRouter> => buildRouter(dependencies);
