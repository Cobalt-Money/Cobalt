import { auth } from "@cobalt-web/auth";
import { createMiddleware } from "hono/factory";

import type { AppEnv } from "../lib/types.js";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession(c.req.raw);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});
