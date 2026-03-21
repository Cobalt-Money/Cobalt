import { env } from "@cobalt-web/env/web";
import { mutators, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCallback } from "react";

import { preloadTransactionsQueries } from "@/routes/transactions/preload-queries";

import { authClient } from "./auth-client";
import { registerActiveZeroForLogout } from "./zero-logout";

const cacheURL = env.VITE_ZERO_CACHE_URL ?? "http://localhost:4848";

/**
 * App shell wrapper (see `routes/__root.tsx`), matching ztunes `ZeroInit`.
 * Rocicorp's `ZeroProvider` renders nothing until `Zero` exists, so the shell is
 * blank until then — same tradeoff as ztunes.
 */

export function ZeroProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const session = authClient.useSession();
  const context: Context = session.data
    ? { userId: session.data.user.id }
    : undefined;
  const userID = session.data?.user.id ?? "anon";

  const mergedInit = useCallback(
    (z: Zero) => {
      router.update({
        context: {
          ...router.options.context,
          zero: z,
        },
      });
      router.invalidate();
      registerActiveZeroForLogout(z);
      preloadTransactionsQueries(z);
    },
    [router]
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
