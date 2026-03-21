import { env } from "@cobalt-web/env/web";
import { mutators, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import type { ReactNode } from "react";
import { useCallback } from "react";

import { authClient } from "./auth-client";
import { registerActiveZeroForLogout } from "./zero-logout";

const cacheURL = env.VITE_ZERO_CACHE_URL ?? "http://localhost:4848";

/**
 * Wrap only route subtrees that use `useQuery` / `useZero`.
 * Do not wrap the root router: Rocicorp's `ZeroProvider` renders nothing until `Zero`
 * is created in an effect (`zero && <Provider>`), which blanks the whole app until then.
 */

export function ZeroProvider({
  children,
  init,
}: {
  children: ReactNode;
  /**
   * Runs once when the `Zero` client is constructed — same pattern as ztunes
   * (`ZeroProvider` `init`). Prefer this over `useEffect` + `preload` in a child.
   */
  init?: (z: Zero) => void;
}) {
  const session = authClient.useSession();
  const context: Context = session.data
    ? { userId: session.data.user.id }
    : undefined;
  const userID = session.data?.user.id ?? "anon";

  const mergedInit = useCallback(
    (z: Zero) => {
      registerActiveZeroForLogout(z);
      init?.(z);
    },
    [init]
  );

  return (
    <BaseZeroProvider
      {...{
        cacheURL,
        context,
        init: mergedInit,
        mutators,
        schema,
        userID,
      }}
    >
      {children}
    </BaseZeroProvider>
  );
}
