import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";
import { createApp } from "../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";
import { confirmUpload } from "./_shared/service.js";
import type { WorkspaceFilesDependencies } from "./_shared/service.js";
import { confirmUploadSchema, fileParamsSchema, fileResponseSchema } from "./_shared/schemas.js";

const route = createRoute({
  description: "Verify object identity and metadata, then make a pending file reference ready.",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{workspaceId}/uploads/{fileId}/confirm",
  request: {
    body: jsonContentRequired(confirmUploadSchema, "Object identity"),
    params: fileParamsSchema,
  },
  responses: {
    200: jsonContent(fileResponseSchema, "Confirmed file"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid object key or metadata"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Workspace or file not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Upload is missing or already confirmed"),
    422: validationErrorResponse(confirmUploadSchema),
    502: jsonContent(errorResponseWithCodeSchema, "Workspace provider unavailable"),
  },
  summary: "Confirm workspace file upload",
  tags: ["Workspace files"],
});

const buildRouter = (dependencies: WorkspaceFilesDependencies) =>
  createApp().openapi(route, async (c) => {
    const { fileId, workspaceId } = c.req.valid("param");
    const file = await confirmUpload(
      dependencies,
      c.var.user.id,
      workspaceId,
      fileId,
      c.req.valid("json"),
    );
    return c.json(fileResponseSchema.parse({ file }), 200);
  });

export const createConfirmRouter = (
  dependencies: WorkspaceFilesDependencies,
): ReturnType<typeof buildRouter> => buildRouter(dependencies);
