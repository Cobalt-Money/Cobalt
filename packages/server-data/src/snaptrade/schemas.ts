import { z } from "@hono/zod-openapi";

// ── Request ────────────────────────────────────────────────────────

export const generatePortalQuerySchema = z.object({
  broker: z.string().optional().default(""),
  reconnectAuthorizationId: z.string().optional(),
});

// ── Response ───────────────────────────────────────────────────────

export const connectionPortalResponseSchema = z.object({
  redirectURI: z.string(),
  sessionId: z.string().optional(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});
