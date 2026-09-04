import { OpenAPIHono } from "@hono/zod-openapi";
import type { WorkspaceFilesDependencies } from "./_shared/service.js";
import { createConfirmRouter } from "./confirm.js";
import { createDeleteRouter } from "./delete.js";
import { createDetailRouter } from "./detail.js";
import { createDownloadRouter } from "./download.js";
import { createInitializeRouter } from "./initialize.js";
import { createListRouter } from "./list.js";
import { createUploadRouter } from "./upload.js";

export type {
  DirectUploadRequest,
  DirectUploadTarget,
  WorkspaceFilesDependencies,
  WorkspaceFilesMetadataAdapter,
  WorkspaceFilesObjectStorageAdapter,
} from "./_shared/service.js";

const buildRouter = (dependencies: WorkspaceFilesDependencies) =>
  new OpenAPIHono()
    .route("/", createInitializeRouter(dependencies))
    .route("/", createUploadRouter(dependencies))
    .route("/", createConfirmRouter(dependencies))
    .route("/", createListRouter(dependencies))
    .route("/", createDownloadRouter(dependencies))
    .route("/", createDetailRouter(dependencies))
    .route("/", createDeleteRouter(dependencies));

/**
 * Provider-neutral router factory. SRI-371 supplies the concrete metadata and
 * object-storage adapters before mounting this router in the central server.
 */
export const createWorkspaceFilesRouter = (
  dependencies: WorkspaceFilesDependencies,
): ReturnType<typeof buildRouter> => buildRouter(dependencies);
