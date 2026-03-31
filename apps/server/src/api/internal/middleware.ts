import { auth } from "@cobalt-web/auth";
import { userHasActiveSubscription } from "@cobalt-web/server-data/subscriptions";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { createMiddleware } from "hono/factory";

const toZeroContext = (userId: string) => ({ userId });

/** Session only (Better Auth). Use on routes that do not require a paid plan. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  c.set("zeroContext", toZeroContext(session.user.id));
  await next();
});

/**
 * Authenticated user with an active paid plan (Stripe and/or mobile, DB-backed).
 * Common SaaS naming: "paid user" = session + subscription/entitlement.
 *
 * @see https://www.better-auth.com/docs/integrations/hono
 */
export const requirePaidUser = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  c.set("zeroContext", toZeroContext(session.user.id));

  const entitled = await userHasActiveSubscription(session.user.id);
  if (!entitled) {
    return c.json({ error: "Subscription required" }, 403);
  }
  await next();
});
