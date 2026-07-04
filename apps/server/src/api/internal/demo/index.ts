import { auth } from "@cobalt-web/auth";
import { env } from "@cobalt-web/env/server";
import { deleteUser } from "@cobalt-web/server-data/user/mutations";
import { ApiError } from "@cobalt-web/server-data/_shared/api-error";
import { waitUntil } from "@vercel/functions";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { getRun, start } from "workflow/api";

import { createApp } from "../../../lib/create-app.js";
import { demoSeedWorkflow } from "../../../workflows/demo-seed/workflow.js";
import { requireAuth } from "../middleware.js";

const DEMO_ORIGIN_COOKIE = "cobalt:demo-origin";

interface DemoSessionResult {
  cookies: string[];
  authToken: string | null;
  userId: string;
  runId: string;
}

/**
 * Spin a fresh demo user + session via Better Auth's anonymous plugin, then
 * kick off the demo-seed workflow **in the background** so this handler can
 * return in <500ms. The Better Auth user.create hook already seeded the
 * user's category rows synchronously; the workflow layers the 28k-row
 * fixture set (accounts, txns, snapshots, chats, holdings) on top and
 * streams progress via `/api/demo/progress/:runId`.
 *
 * Doing the seed inline here is what OOMed single-node zero-cache: 28k rows
 * landed on PlanetScale's replication slot in one burst and the WAL drain
 * couldn't keep up. The workflow paces phase-by-phase.
 */
async function createDemoSession(req: Request): Promise<DemoSessionResult> {
  const response = (await auth.api.signInAnonymous({
    asResponse: true,
    headers: req.headers,
  })) as Response;
  if (!response.ok) {
    throw new ApiError(
      502,
      "anonymous_session_failed",
      `signInAnonymous failed: ${response.status}`,
    );
  }
  const payload = (await response.json()) as { user?: { id?: string } };
  const userId = payload.user?.id;
  if (!userId) {
    throw new ApiError(502, "anonymous_session_failed", "signInAnonymous returned no user id");
  }

  const run = await start(demoSeedWorkflow, [{ userId }]);

  return {
    authToken: response.headers.get("set-auth-token"),
    cookies: response.headers.getSetCookie(),
    runId: run.runId,
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

export const demoRouter = createApp()
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

    const { cookies, authToken, userId, runId } = await createDemoSession(c.req.raw);
    for (const cookie of cookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }
    if (authToken) {
      c.header("set-auth-token", authToken);
    }
    return c.json({ isDemo: true as const, runId, userId });
  })
  .get("/progress/:runId", async (c) => {
    // NDJSON stream of demo-seed phase progress. Auth intentionally omitted:
    // this fires immediately after `/create` before the anon session cookie
    // is guaranteed to have hit the client, and the runId is opaque enough
    // (Vercel-Workflow-generated) that guessing it isn't a threat.
    const runId = c.req.param("runId");
    const startIndexParam = c.req.query("startIndex");
    const startIndex = startIndexParam ? Number.parseInt(startIndexParam, 10) : 0;

    const run = getRun(runId);
    if (!(await run.exists)) {
      throw new ApiError(404, "demo_run_not_found", "Workflow run not found");
    }
    const readable = run.getReadable({ namespace: "progress", startIndex });

    const encoder = new TextEncoder();
    const ndjson = readable.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
        },
      }),
    );

    return new Response(ndjson, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-ndjson",
      },
    });
  })
  .post("/enter", requireAuth, async (c) => {
    const originUser = c.var.user;
    if (originUser.isAnonymous) {
      return c.json({ code: "already_in_demo", error: "Already in demo mode" }, 400);
    }

    // signOut must succeed: signInAnonymous below will replace the session
    // cookie, but if signOut errored the real user's server-side session row
    // is still active — security smell.
    let signOutCookies: string[];
    try {
      signOutCookies = await signOutAndCollectCookies(c.req.raw);
    } catch (error) {
      console.error("[demo] enter signOut failed", error);
      return c.json({ code: "signout_failed", error: "Failed to suspend current session" }, 500);
    }

    const { cookies, authToken, userId, runId } = await createDemoSession(c.req.raw);

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

    return c.json({ isDemo: true as const, runId, userId });
  })
  .post("/exit", requireAuth, async (c) => {
    const currentUser = c.var.user;
    if (!currentUser.isAnonymous) {
      return c.json({ code: "not_in_demo", error: "Not in demo mode" }, 400);
    }

    const signedOrigin = await getSignedCookie(c, env.BETTER_AUTH_SECRET, DEMO_ORIGIN_COOKIE);
    const originUserId = signedOrigin || null;

    // signOut FIRST while the session row is still live so Better Auth emits
    // real clear-cookie Set-Cookie headers. If we deleted the user first, the
    // cascade would kill the session row and signOut would 401 — leaving the
    // stale session cookie in the browser (server-side auth still resolves
    // to null so UX looks logged-out, but the cookie lingers).
    let clearCookies: string[] = [];
    try {
      clearCookies = await signOutAndCollectCookies(c.req.raw);
    } catch (error) {
      console.warn("[demo] exit signOut failed", error);
    }

    // Fire-and-forget: waitUntil keeps the Vercel Function alive after the
    // HTTP response is sent so the ~22k-row cascade DELETE finishes without
    // blocking the exit redirect. `deleteStaleAnonymousUsers` cron is the
    // safety net if this ever crashes mid-delete.
    waitUntil(deleteUser(currentUser.id));

    for (const cookie of clearCookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }
    deleteCookie(c, DEMO_ORIGIN_COOKIE, { path: "/" });

    return c.json({ ok: true, originUserId });
  });
