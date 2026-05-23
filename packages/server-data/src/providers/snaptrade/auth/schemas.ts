import { z } from "@hono/zod-openapi";

export const generatePortalQuerySchema = z.object({
  broker: z.string().optional().default(""),
  reconnectAuthorizationId: z.string().optional(),
});

export const connectionPortalResponseSchema = z
  .object({
    redirectURI: z.string(),
    sessionId: z.string().optional(),
  })
  .openapi("ConnectionPortal");

export { errorResponseSchema } from "../../../_shared/schemas.js";
