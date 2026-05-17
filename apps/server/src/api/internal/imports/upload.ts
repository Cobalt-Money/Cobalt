import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { uploadAndStageImport } from "@cobalt-web/server-data/import/upload/actions";
import { uploadResponseSchema } from "@cobalt-web/server-data/import/shared/schemas";
import { ImportGateError, MAX_UPLOAD_BYTES } from "@cobalt-web/server-data/import/upload/gates";

import { createApp } from "../../../lib/create-app.js";
import { requireAuth } from "../middleware.js";

/**
 * Multipart upload — not a `createRoute` (zod-openapi doesn't model multipart well).
 * Errors throw `ApiError`; `createApp`'s `onError` maps them to `{code, error}` JSON.
 */
export const importsUploadRouter = createApp().post("/", requireAuth, async (c) => {
  const form = await c.req.parseBody({ all: false });
  const { file } = form;
  if (!(file instanceof File)) {
    throw new ApiError(400, "file_required", "Missing 'file' field");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(413, "file_too_large", "File exceeds upload limit");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const { headers, jobId, sampleRows, totalRows } = await uploadAndStageImport({
      buffer,
      filename: file.name,
      userId: c.var.user.id,
    });
    return c.json(uploadResponseSchema.parse({ headers, id: jobId, sampleRows, totalRows }), 201);
  } catch (error) {
    if (error instanceof ImportGateError) {
      throw new ApiError(400, error.code, error.message);
    }
    throw error;
  }
});
