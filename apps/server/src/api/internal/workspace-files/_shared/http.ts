import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { MAX_FILE_SIZE } from "./schemas.js";

export const contentDisposition = (name: string): string => {
  const ascii = name.replaceAll(/[^\u0020-\u007E]/gu, "_").replaceAll(/["\\]/gu, "_");
  return ascii === name
    ? `attachment; filename="${ascii}"`
    : `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

export const readUploadBytes = async (request: Request): Promise<Uint8Array> => {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE) {
    throw new ApiError(413, "file_too_large", "File exceeds the 25 MiB limit");
  }
  if (!request.body) {
    return new Uint8Array();
  }
  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > MAX_FILE_SIZE) {
      await reader.cancel();
      throw new ApiError(413, "file_too_large", "File exceeds the 25 MiB limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};
