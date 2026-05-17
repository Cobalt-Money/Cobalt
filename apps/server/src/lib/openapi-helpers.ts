import { createErrorSchema } from "@cobalt-web/server-data/_shared/schemas";
import type { z } from "@hono/zod-openapi";

export const jsonContent = <T extends z.ZodType>(schema: T, description: string) => ({
  content: { "application/json": { schema } },
  description,
});

export const jsonContentRequired = <T extends z.ZodType>(schema: T, description: string) => ({
  content: { "application/json": { schema } },
  description,
  required: true,
});

/**
 * Standard 422 response for a `createRoute` validation failure. Pair with the
 * route's `request` schema so the typed RPC client gets `issues[].path` for the
 * actual input shape.
 */
export const validationErrorResponse = <T extends z.ZodType>(inputSchema: T) =>
  jsonContent(createErrorSchema(inputSchema), "Validation failed");
