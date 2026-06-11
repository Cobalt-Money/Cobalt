import { env } from "@cobalt-web/env/web";
import { mutators, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { authClient } from "./auth-client";

const cacheURL = env.VITE_ZERO_CACHE_URL ?? "http://localhost:4848";

export function ZeroProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const authenticatedUserId = session.data?.user.id;
  const context = useMemo<Context | undefined>(
    () => (authenticatedUserId ? { userId: authenticatedUserId } : undefined),
    [authenticatedUserId],
  );

  // Logged-out clients: omit `userID` entirely (Zero ≥ 1.6 requires this for
  // anonymous sync). Authed clients: pass the real user id.
  return authenticatedUserId ? (
    <BaseZeroProvider
      cacheURL={cacheURL}
      context={context}
      mutators={mutators}
      schema={schema}
      userID={authenticatedUserId}
    >
      {children}
    </BaseZeroProvider>
  ) : (
    <BaseZeroProvider cacheURL={cacheURL} context={undefined} mutators={mutators} schema={schema}>
      {children}
    </BaseZeroProvider>
  );
}
