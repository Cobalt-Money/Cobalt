import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect } from "react";

import { authClient } from "../clients/auth-client";

type AppSession = ReturnType<typeof authClient.useSession>;
const AppSessionContext = createContext<AppSession | undefined>(undefined);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const router = useRouter();

  // Mirror session into router context so beforeLoad hooks can guard
  // synchronously. Without this, route guards have to await getSession() (slow,
  // sometimes cookie-cached and stale) or do component-level Navigate (which
  // flashes protected content). See routes/_auth/route.tsx and
  // routes/_auth/onboarding.tsx for consumers.
  useEffect(() => {
    const sessionUser = session.data?.user as
      | { id: string; isAnonymous?: boolean; onboardedAt?: Date | string | null }
      | undefined;
    router.update({
      context: {
        ...router.options.context,
        auth: {
          isPending: session.isPending,
          user: sessionUser
            ? {
                id: sessionUser.id,
                isAnonymous: sessionUser.isAnonymous,
                onboardedAt: sessionUser.onboardedAt,
              }
            : null,
        },
      },
    });
    router.invalidate();
  }, [session.data, session.isPending, router]);

  return <AppSessionContext.Provider value={session}>{children}</AppSessionContext.Provider>;
}

export function useAppSession() {
  const session = useContext(AppSessionContext);
  if (!session) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }
  return session;
}
