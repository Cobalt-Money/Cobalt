import { env } from "@cobalt-web/env/web";
import { mutators, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";

import { registerActiveZeroForLogout } from "../zero-logout";
import { useAppSession } from "./app-session";

const cacheURL = env.VITE_ZERO_CACHE_URL ?? "http://localhost:4848";

/**
 * Thin wrapper matching ztunes `ZeroInit`.
 *
 * No blocking shell — Zero renders children immediately and hydrates data
 * as the connection establishes. Better Auth session churn during startup
 * no longer causes visible re-flashes or stuck spinners.
 */
export function ZeroProvider({ children }: { children: ReactNode }) {
  const session = useAppSession();
  const authenticatedUserId = session.data?.user.id;
  const userID = authenticatedUserId ?? "anon";
  const context = useMemo<Context | undefined>(
    () => (authenticatedUserId ? { userId: authenticatedUserId } : undefined),
    [authenticatedUserId]
  );

  const init = useCallback((z: Zero) => {
    registerActiveZeroForLogout(z);
  }, []);

  return (
    <BaseZeroProvider
      {...{ cacheURL, context, init, mutators, schema, userID }}
    >
      {children}
    </BaseZeroProvider>
  );
}
