import { auth } from "@cobalt-web/auth";
import { db } from "@cobalt-web/db";
import { seedDemoUser } from "@cobalt-web/db/demo/seed-demo-user";
import { user as userTable } from "@cobalt-web/db/schema/users/auth/auth";
import { env } from "@cobalt-web/env/server";
import type { AppEnv } from "@cobalt-web/server-data/types";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";

import { requireAuth } from "../middleware.js";

const DEMO_ORIGIN_COOKIE = "cobalt:demo-origin";

interface DemoSessionResult {
  cookies: string[];
  authToken: string | null;
  userId: string;
}

/**
 * Spin a fresh demo user + session via Better Auth's anonymous plugin, then
 * seed fixtures owned by the new user. The plugin's user.create hook fires
 * `seedUserCategories` first; we layer the demo fixture set on top.
 */
async function createDemoSession(req: Request): Promise<DemoSessionResult> {
  const response = (await auth.api.signInAnonymous({
    asResponse: true,
    headers: req.headers,
  })) as Response;
  if (!response.ok) {
    throw new Error(`signInAnonymous failed: ${response.status}`);
  }
  const payload = (await response.json()) as { user?: { id?: string } };
  const userId = payload.user?.id;
  if (!userId) {
    throw new Error("signInAnonymous returned no user id");
  }

  await seedDemoUser(db, userId);

  return {
    authToken: response.headers.get("set-auth-token"),
    cookies: response.headers.getSetCookie(),
    userId,
  };
}

/**
 * Sign the current user out via Better Auth and return its Set-Cookie headers
 * so the caller can forward them. Forwarding is required — without it the
 * browser keeps the stale cookie and the next request is auth-confused.
 */
async function signOutAndCollectCookies(req: Request): Promise<string[]> {
  const response = (await auth.api.signOut({
    asResponse: true,
    headers: req.headers,
  })) as Response;
  return response.headers.getSetCookie();
}

export const demoRouter = new OpenAPIHono<AppEnv>()
  .post("/create", async (c) => {
    // Idempotent: if the caller already has an anonymous (demo) session,
    // reuse it instead of spawning a fresh user + fixture set. Saves ~400
    // DB writes per refresh and keeps visitor edits across reloads.
    const existing = await auth.api.getSession({ headers: c.req.raw.headers });
    if (existing?.user.isAnonymous) {
      return c.json({ isDemo: true as const, userId: existing.user.id });
    }
    // A real (non-demo) session here means the caller should hit /enter,
    // which preserves the origin user via the signed cookie.
    if (existing) {
      return c.json(
        {
          code: "real_session_active",
          error: "Sign out or use /enter to switch to demo",
        },
        409,
      );
    }

    const { cookies, authToken, userId } = await createDemoSession(c.req.raw);
    for (const cookie of cookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }
    if (authToken) {
      c.header("set-auth-token", authToken);
    }
    return c.json({ isDemo: true as const, userId });
  })
  .post("/enter", requireAuth, async (c) => {
    const originUser = c.var.user;
    if (originUser.isAnonymous) {
      return c.json({ error: "Already in demo mode" }, 400);
    }

    // signOut must succeed: signInAnonymous below will replace the session
    // cookie, but if signOut errored the real user's server-side session row
    // is still active — security smell.
    let signOutCookies: string[];
    try {
      signOutCookies = await signOutAndCollectCookies(c.req.raw);
    } catch (error) {
      console.error("[demo] enter signOut failed", error);
      return c.json({ error: "Failed to suspend current session" }, 500);
    }

    const { cookies, authToken, userId } = await createDemoSession(c.req.raw);

    // signOut clears first, then signInAnonymous sets. Same cookie name in
    // both — last write wins in the browser store.
    for (const cookie of signOutCookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }
    for (const cookie of cookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }
    if (authToken) {
      c.header("set-auth-token", authToken);
    }

    const isSecureOrigin = env.BETTER_AUTH_URL.startsWith("https://");
    await setSignedCookie(c, DEMO_ORIGIN_COOKIE, originUser.id, env.BETTER_AUTH_SECRET, {
      httpOnly: true,
      maxAge: 60 * 60 * 4,
      path: "/",
      sameSite: "Lax",
      secure: isSecureOrigin,
    });

    return c.json({ isDemo: true as const, userId });
  })
  .post("/exit", requireAuth, async (c) => {
    const currentUser = c.var.user;
    if (!currentUser.isAnonymous) {
      return c.json({ error: "Not in demo mode" }, 400);
    }

    const signedOrigin = await getSignedCookie(c, env.BETTER_AUTH_SECRET, DEMO_ORIGIN_COOKIE);
    const originUserId = signedOrigin || null;

    // Delete the user row first — cascades sessions + all owned data — so
    // even if a stale Better Auth cookie cache returns the user briefly, the
    // next getSession DB lookup misses.
    await db.delete(userTable).where(eq(userTable.id, currentUser.id));

    // Forward Better Auth's own clear-cookie headers from signOut rather than
    // hand-rolling the cookie name list. Defensive: if signOut throws (likely
    // because the session row was already cascade-deleted), the user row
    // delete above is the real guarantee.
    try {
      const clearCookies = await signOutAndCollectCookies(c.req.raw);
      for (const cookie of clearCookies) {
        c.header("Set-Cookie", cookie, { append: true });
      }
    } catch (error) {
      console.warn("[demo] exit signOut failed", error);
    }

    deleteCookie(c, DEMO_ORIGIN_COOKIE, { path: "/" });

    return c.json({ ok: true, originUserId });
  });
