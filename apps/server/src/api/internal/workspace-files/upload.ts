import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";
import { readUploadBytes } from "./_shared/http.js";
import { uploadBytes } from "./_shared/service.js";
import type { WorkspaceFilesDependencies } from "./_shared/service.js";
import { fileParamsSchema } from "./_shared/schemas.js";

const route = createRoute({
  description: "Proxy file bytes to object storage using metadata fixed during initialization.",
  method: "put",
  middleware: [requireAuth] as const,
  path: "/{workspaceId}/uploads/{fileId}",
  request: { params: fileParamsSchema },
  responses: {
    204: { description: "Upload stored" },
    400: jsonContent(errorResponseWithCodeSchema, "Uploaded bytes do not match initialization"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Workspace or file not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Upload already confirmed"),
    413: jsonContent(errorResponseWithCodeSchema, "Upload exceeds the file-size limit"),
    422: validationErrorResponse(fileParamsSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Workspace provider unavailable"),
  },
  summary: "Upload workspace file bytes through the server",
  tags: ["Workspace files"],
});

const buildRouter = (dependencies: WorkspaceFilesDependencies) =>
  createApp().openapi(route, async (c) => {
    const { fileId, workspaceId } = c.req.valid("param");
    const bytes = await readUploadBytes(c.req.raw);
    await uploadBytes(
      dependencies,
      c.var.user.id,
      workspaceId,
      fileId,
      c.req.header("content-type"),
      bytes,
    );
    return c.body(null, 204);
  });

export const createUploadRouter = (
  dependencies: WorkspaceFilesDependencies,
): ReturnType<typeof buildRouter> => buildRouter(dependencies);
