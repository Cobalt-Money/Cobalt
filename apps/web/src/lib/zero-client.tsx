import { env } from "@cobalt-web/env/web";
import { mutators, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import type { ReactNode } from "react";

import { authClient } from "./auth-client";

const cacheURL = env.VITE_ZERO_CACHE_URL ?? "http://localhost:4848";

/**
 * Wrap only route subtrees that use `useQuery` / `useZero`.
 * Do not wrap the root router: Rocicorp's `ZeroProvider` renders nothing until `Zero`
 * is created in an effect (`zero && <Provider>`), which blanks the whole app until then.
 */

export function ZeroProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const context: Context = session.data
    ? { userId: session.data.user.id }
    : undefined;
  const userID = session.data?.user.id ?? "anon";

  return (
    <BaseZeroProvider {...{ cacheURL, context, mutators, schema, userID }}>
      {children}
    </BaseZeroProvider>
  );
}
