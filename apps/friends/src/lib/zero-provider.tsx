import { env } from "@cobalt-web/env/web";
import { mutators, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { authClient } from "./auth-client";

const cacheURL = env.VITE_ZERO_CACHE_URL ?? "http://localhost:4848";

// Sentinel passed to Zero when there's no session. Zero needs a userID to
// open a connection — "anon" lets the landing-page demo network load without
// auth. Backend `ctx.userId` stays unset (no JWT), so social queries
// substitute the demo user. Mirror of zbugs' anon pattern.
const ANON_USER_ID = "anon";

export function ZeroProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const authenticatedUserId = session.data?.user.id;
  const context = useMemo<Context | undefined>(
    () => (authenticatedUserId ? { userId: authenticatedUserId } : undefined),
    [authenticatedUserId],
  );

  return (
    <BaseZeroProvider
      cacheURL={cacheURL}
      context={context}
      mutators={mutators}
      schema={schema}
      userID={authenticatedUserId ?? ANON_USER_ID}
    >
      {children}
    </BaseZeroProvider>
  );
}
