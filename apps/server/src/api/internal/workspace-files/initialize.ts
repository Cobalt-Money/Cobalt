import { errorResponseWithCodeSchema } from "@cobalt-web/server-data/_shared/schemas";
import { createRoute } from "@hono/zod-openapi";
import { createApp } from "../../../lib/create-app.js";
import {
  jsonContent,
  jsonContentRequired,
  validationErrorResponse,
} from "../../../lib/openapi-helpers.js";
import { requireAuth } from "../middleware.js";
import { initializeUpload } from "./_shared/service.js";
import type { WorkspaceFilesDependencies } from "./_shared/service.js";
import {
  initializeUploadResponseSchema,
  initializeUploadSchema,
  workspaceParamsSchema,
} from "./_shared/schemas.js";

const route = createRoute({
  description: "Create pending file metadata and return a direct or server-proxied upload target.",
  method: "post",
  middleware: [requireAuth] as const,
  path: "/{workspaceId}/uploads",
  request: {
    body: jsonContentRequired(initializeUploadSchema, "Upload metadata"),
    params: workspaceParamsSchema,
  },
  responses: {
    201: jsonContent(initializeUploadResponseSchema, "Upload initialized"),
    400: jsonContent(errorResponseWithCodeSchema, "Invalid file metadata"),
    401: jsonContent(errorResponseWithCodeSchema, "Unauthorized"),
    404: jsonContent(errorResponseWithCodeSchema, "Workspace not found"),
    409: jsonContent(errorResponseWithCodeSchema, "Upload conflict"),
    422: validationErrorResponse(initializeUploadSchema),
    501: jsonContent(errorResponseWithCodeSchema, "Direct upload unavailable"),
    502: jsonContent(errorResponseWithCodeSchema, "Workspace provider unavailable"),
  },
  summary: "Initialize workspace file upload",
  tags: ["Workspace files"],
});

const buildRouter = (dependencies: WorkspaceFilesDependencies) =>
  createApp().openapi(route, async (c) => {
    const { workspaceId } = c.req.valid("param");
    const result = await initializeUpload(
      dependencies,
      c.var.user.id,
      workspaceId,
      c.req.valid("json"),
    );
    return c.json(initializeUploadResponseSchema.parse(result), 201);
  });

export const createInitializeRouter = (
  dependencies: WorkspaceFilesDependencies,
): ReturnType<typeof buildRouter> => buildRouter(dependencies);
