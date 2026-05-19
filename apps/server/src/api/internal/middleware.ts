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
    return c.json({ code: "unauthorized", error: "Unauthorized" }, 401);
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
    return c.json({ code: "unauthorized", error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  c.set("zeroContext", toZeroContext(session.user.id));

  // Demo (anonymous) users bypass the subscription gate. They consume the
  // same paid surfaces (Zero sync, agent chat) against seeded fixtures so
  // prospects can see the full product before paying.
  if (!session.user.isAnonymous) {
    const entitled = await userHasActiveSubscription(session.user.id);
    if (!entitled) {
      return c.json({ code: "subscription_required", error: "Subscription required" }, 403);
    }
  }
  await next();
});

/**
 * Reject the request if the authenticated user is a demo (anonymous) account.
 *
 * Demo === anonymous in this app — Better Auth's anonymous plugin sets
 * `isAnonymous=true` when /api/demo/create mints the session. Use on
 * side-effectful routes that must not run for demo users: Plaid link/sync,
 * Stripe checkout/portal, email sends, OAuth/MCP token issuance, account
 * delete, email change. Apply *after* `requireAuth` so `c.var.user` is set.
 */
export const requireNotDemo = createMiddleware<AppEnv>(async (c, next) => {
  if (c.var.user?.isAnonymous) {
    return c.json({ code: "demo_blocked", error: "Not available in demo mode" }, 403);
  }
  await next();
});
