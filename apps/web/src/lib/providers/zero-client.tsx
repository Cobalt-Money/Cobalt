import { env } from "@cobalt-web/env/web";
import { mutators, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCallback, useMemo } from "react";

import { registerActiveZeroForLogout } from "../zero-logout";
import { useAppSession } from "./app-session";

const cacheURL = env.VITE_ZERO_CACHE_URL ?? "http://localhost:4848";

/**
 * Authenticated app shell Zero client.
 *
 * The `init` callback mirrors the instance into TanStack Router context so route
 * loaders can call `context.zero?.preload()` — see
 * `.agents/skills/rocicorp-zero/reading/running-preloading.md`. Components
 * subscribe with `useQuery` and gate "not found" UI on `result.type === 'complete'`
 * per zero.rocicorp.dev/docs/queries#missing-data.
 */
export function ZeroProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = useAppSession();
  const authenticatedUserId = session.data?.user.id;
  const userID = authenticatedUserId;
  const context = useMemo<Context | undefined>(
    () => (authenticatedUserId ? { userId: authenticatedUserId } : undefined),
    [authenticatedUserId],
  );

  const init = useCallback(
    (z: Zero) => {
      registerActiveZeroForLogout(z);
      router.update({
        context: {
          ...router.options.context,
          zero: z,
        },
      });
    },
    [router],
  );

  return (
    <BaseZeroProvider {...{ cacheURL, context, init, mutators, schema, userID }}>
      {children}
    </BaseZeroProvider>
  );
}
