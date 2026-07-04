import { DemoContext } from "@cobalt-web/ui/hooks/use-demo";
import type { DemoContextValue } from "@cobalt-web/ui/hooks/use-demo";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";

import { demoApi } from "../clients/api-client";

import { useAppSession } from "./app-session";

/**
 * Source of truth for `isDemo` is the Better Auth session's `isAnonymous` flag —
 * every anonymous user in this app is a demo. Mutations hit the server demo
 * endpoints which swap cookies; we then refetch the session so consumers
 * re-render with the new identity.
 *
 * Mirrors `PrivacyProvider` in shape; differs in that state is server-owned.
 */
export function DemoProvider({ children }: { children: ReactNode }) {
  const session = useAppSession();
  const [pending, setPending] = useState(false);

  const isDemo = Boolean(
    (session.data?.user as { isAnonymous?: boolean } | undefined)?.isAnonymous,
  );

  const runMutation = useCallback(
    async (mutation: () => Promise<Response>) => {
      setPending(true);
      try {
        const response = await mutation();
        if (!response.ok) {
          throw new Error(`demo mutation failed: ${response.status}`);
        }
        // Persist the workflow runId across the hard reload so the reloaded
        // shell can subscribe to `/api/demo/progress/:runId` and render seed
        // progress without re-issuing the POST.
        try {
          const body = (await response.clone().json()) as { runId?: string };
          if (body.runId && typeof window !== "undefined") {
            window.sessionStorage.setItem("cobalt:demo-seed-run", body.runId);
          }
        } catch {
          // Non-JSON response (e.g., `/exit`) — no runId to persist.
        }
        await session.refetch?.();
      } finally {
        setPending(false);
      }
    },
    [session],
  );

  const isAuthenticated = Boolean(session.data?.user);

  /**
   * Public entry point bound to <TryDemoButton />. Auto-routes:
   *   - Authed real user → /enter (signs out real session, stamps origin cookie)
   *   - Authed demo user → already in demo, just navigate home
   *   - Unauthenticated → /create (fresh anon)
   */
  const createAnonymous = useCallback(async () => {
    // Already in demo → skip the round-trip, just navigate.
    if (isDemo) {
      window.location.assign("/home");
      return;
    }
    // Real session → /enter (signs out + stamps origin cookie).
    // No session → /create (mints fresh anon).
    await runMutation(() => (isAuthenticated ? demoApi.enter.$post() : demoApi.create.$post()));
    // Hard reload so Zero re-bootstraps under the new userId.
    window.location.assign("/home");
  }, [isAuthenticated, isDemo, runMutation]);

  const enter = useCallback(async () => {
    await runMutation(() => demoApi.enter.$post());
    window.location.assign("/home");
  }, [runMutation]);

  const exit = useCallback(async () => {
    // Fire-and-forget on the client too: we don't need to await the delete,
    // just need the server to have cleared the auth cookie (done synchronously
    // in the handler before waitUntil). Hard reload to "/" re-bootstraps auth.
    setPending(true);
    try {
      await demoApi.exit.$post();
    } finally {
      setPending(false);
    }
    window.location.assign("/");
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({ createAnonymous, enter, exit, isDemo, pending }),
    [createAnonymous, enter, exit, isDemo, pending],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
