import { z } from "@hono/zod-openapi";

/** Promise-facing projection of the SRI-360 FileRecord contract for HTTP adapters. */
export interface FileRecord {
  readonly checksum: string;
  readonly contentType: string;
  readonly createdAt: string;
  readonly fileId: string;
  readonly idempotencyKey?: string;
  readonly kind: "artifact" | "upload";
  readonly name: string;
  readonly objectKey: string;
  readonly path: string;
  readonly size: number;
  readonly state: "deleted" | "failed" | "pending" | "ready";
  readonly updatedAt: string;
  readonly userId: string;
  readonly workspaceId: string;
}

/** Promise-facing projection of the SRI-360 StorageObjectMetadata contract. */
export interface StorageObjectMetadata {
  readonly checksum: string;
  readonly contentType: string;
  readonly size: number;
}

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const SUPPORTED_CONTENT_TYPES = [
  "application/json",
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/markdown",
  "text/plain",
] as const;

const uuidSchema = z.uuid();
const mimeTypeSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u);
const isBaseName = (value: string): boolean => {
  if (value.includes("/") || value.includes("\\")) {
    return false;
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || codePoint === 127) {
      return false;
    }
  }
  return true;
};
const fileNameSchema = z
  .string()
  .min(1)
  .max(255)
  .refine((value) => value === value.trim(), "fileName must not have surrounding whitespace")
  .refine((value) => value !== "." && value !== "..", "fileName is invalid")
  .refine(isBaseName, "fileName must be a basename");
const checksumSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/u);

export const workspaceParamsSchema = z.object({ workspaceId: uuidSchema });
export const fileParamsSchema = z.object({ fileId: uuidSchema, workspaceId: uuidSchema });
export const initializeUploadSchema = z.object({
  checksum: checksumSchema,
  contentType: z.enum(SUPPORTED_CONTENT_TYPES),
  fileName: fileNameSchema,
  idempotencyKey: z.string().min(1).max(200).optional(),
  size: z.number().int().min(1).max(MAX_FILE_SIZE),
  uploadMode: z.enum(["direct", "proxy"]).default("proxy"),
});
export type InitializeUpload = z.infer<typeof initializeUploadSchema>;

export const confirmUploadSchema = z.object({ objectKey: z.string().min(1).max(1024) });
export type ConfirmUpload = z.infer<typeof confirmUploadSchema>;

export const fileReferenceSchema = z
  .object({ fileId: uuidSchema, workspaceId: uuidSchema })
  .openapi("WorkspaceFileReference");
export const workspaceFileSchema = z
  .object({
    checksum: checksumSchema,
    contentType: mimeTypeSchema,
    createdAt: z.iso.datetime(),
    kind: z.enum(["upload", "artifact"]),
    name: fileNameSchema,
    path: z.string().min(1),
    reference: fileReferenceSchema,
    size: z.number().int().nonnegative(),
    state: z.enum(["pending", "ready", "failed", "deleted"]),
    updatedAt: z.iso.datetime(),
  })
  .openapi("WorkspaceFile");
export type WorkspaceFile = z.infer<typeof workspaceFileSchema>;

export const fileResponseSchema = z
  .object({ file: workspaceFileSchema })
  .openapi("WorkspaceFileResponse");
export const filesResponseSchema = z
  .object({ files: z.array(workspaceFileSchema) })
  .openapi("WorkspaceFilesResponse");
export const uploadTargetSchema = z.discriminatedUnion("mode", [
  z.object({
    headers: z.record(z.string(), z.string()),
    method: z.literal("PUT"),
    mode: z.literal("direct"),
    objectKey: z.string(),
    url: z.url(),
  }),
  z.object({
    headers: z.record(z.string(), z.string()),
    method: z.literal("PUT"),
    mode: z.literal("proxy"),
    objectKey: z.string(),
    url: z.string().min(1),
  }),
]);
export const initializeUploadResponseSchema = z
  .object({ file: workspaceFileSchema, upload: uploadTargetSchema })
  .openapi("InitializeWorkspaceFileUploadResponse");

export const toWorkspaceFile = (record: FileRecord): WorkspaceFile => ({
  checksum: record.checksum,
  contentType: record.contentType,
  createdAt: record.createdAt,
  kind: record.kind,
  name: record.name,
  path: record.path,
  reference: { fileId: record.fileId, workspaceId: record.workspaceId },
  size: record.size,
  state: record.state,
  updatedAt: record.updatedAt,
});
