import { userHasActiveSubscription } from "@cobalt-web/server-data/subscriptions/queries";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { createMiddleware } from "hono/factory";

export const requireActiveSubscription = createMiddleware<AppEnv>(
  async (c, next) => {
    const ok = await userHasActiveSubscription(c.var.user.id);
    if (!ok) {
      return c.json({ error: "Subscription required" }, 403);
    }
    await next();
  }
);
