import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute, z } from "@hono/zod-openapi";
import { createApp } from "../../../lib/create-app.js";
import { jsonContent, validationErrorResponse } from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";
import { contentDisposition } from "./_shared/http.js";
import { downloadFile } from "./_shared/service.js";
import type { WorkspaceFilesDependencies } from "./_shared/service.js";
import { fileParamsSchema } from "./_shared/schemas.js";

const route = createRoute({
  description: "Download ready file bytes after rechecking workspace and object-key ownership.",
  method: "get",
  middleware: [requireAuth] as const,
  path: "/{workspaceId}/files/{fileId}/download",
  request: { params: fileParamsSchema },
  responses: {
    200: {
      content: { "application/octet-stream": { schema: z.string().openapi({ format: "binary" }) } },
      description: "File bytes",
    },
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Workspace, file, or object not found"),
    409: jsonContent(errorResponseWithCodeSchema, "File is not ready"),
    422: validationErrorResponse(fileParamsSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Workspace provider unavailable"),
  },
  summary: "Download workspace file",
  tags: ["Workspace files"],
});

const buildRouter = (dependencies: WorkspaceFilesDependencies) =>
  createApp().openapi(route, async (c) => {
    const { fileId, workspaceId } = c.req.valid("param");
    const { bytes, file } = await downloadFile(dependencies, c.var.user.id, workspaceId, fileId);
    return new Response(Uint8Array.from(bytes).buffer, {
      headers: {
        "Content-Disposition": contentDisposition(file.name),
        "Content-Length": String(bytes.byteLength),
        "Content-Type": file.contentType,
        "X-Content-Type-Options": "nosniff",
      },
      status: 200,
    });
  });

export const createDownloadRouter = (
  dependencies: WorkspaceFilesDependencies,
): ReturnType<typeof buildRouter> => buildRouter(dependencies);
