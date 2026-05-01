import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";

import { verifyBridgeToken } from "./jwt.js";
import { BRIDGE_ROUTES, isBridgeRoute } from "./registry.js";

const execBodySchema = z.object({
  args: z.unknown().optional(),
  route: z.string(),
});

/**
 * Bridge entrypoint for Daytona sandboxes spawned by the MCP `execute_code` tool.
 *
 * Auth: HS256 JWT minted by `signBridgeToken` at sandbox spawn, scoped to one
 * userId + sandboxId, 5-minute TTL. The token is the only auth surface — no
 * cookies, no session — so a leaked token has narrow blast radius.
 */
export const agentBridgeRouter = new OpenAPIHono().post("/exec", async (c) => {
  const auth = c.req.header("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  if (!token) {
    return c.json({ error: "missing bearer token" }, 401);
  }

  let claims: Awaited<ReturnType<typeof verifyBridgeToken>>;
  try {
    claims = await verifyBridgeToken(token);
  } catch {
    return c.json({ error: "invalid or expired bridge token" }, 401);
  }

  const raw = await c.req.json().catch(() => null);
  const parsed = execBodySchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: "invalid body", issues: parsed.error.issues }, 400);
  }

  const { route, args } = parsed.data;
  if (!isBridgeRoute(route)) {
    return c.json({ error: `unknown route: ${route}` }, 404);
  }

  const entry = BRIDGE_ROUTES[route] as {
    schema: z.ZodTypeAny;
    handler: (userId: string, args: unknown) => Promise<unknown>;
  };
  const argsParse = entry.schema.safeParse(args ?? {});
  if (!argsParse.success) {
    return c.json(
      { error: "invalid args", issues: argsParse.error.issues },
      400
    );
  }

  try {
    const data = await entry.handler(claims.userId, argsParse.data);
    return c.json({ data, ok: true }, 200);
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "handler failed",
        ok: false,
      },
      500
    );
  }
});
