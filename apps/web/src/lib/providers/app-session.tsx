import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef } from "react";

import { authClient } from "../clients/auth-client";
import type { AuthSnapshot } from "../../router";

type AppSession = ReturnType<typeof authClient.useSession>;
const AppSessionContext = createContext<AppSession | undefined>(undefined);

function authGuardChanged(prev: AuthSnapshot | null, next: AuthSnapshot): boolean {
  if (!prev) {
    return true;
  }
  if (prev.isPending !== next.isPending) {
    return true;
  }
  if (prev.user?.id !== next.user?.id) {
    return true;
  }
  if (prev.user?.isAnonymous !== next.user?.isAnonymous) {
    return true;
  }
  if (prev.user?.onboardedAt !== next.user?.onboardedAt) {
    return true;
  }
  return false;
}

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  const router = useRouter();
  const prevAuthRef = useRef<AuthSnapshot | null>(null);

  // Mirror session into router context so beforeLoad hooks can guard
  // synchronously. Without this, route guards have to await getSession() (slow,
  // sometimes cookie-cached and stale) or do component-level Navigate (which
  // flashes protected content). See routes/_auth/route.tsx and
  // routes/_auth/onboarding.tsx for consumers.
  useEffect(() => {
    const sessionUser = session.data?.user as
      | { id: string; isAnonymous?: boolean; onboardedAt?: Date | string | null }
      | undefined;
    const nextAuth: AuthSnapshot = {
      isPending: session.isPending,
      user: sessionUser
        ? {
            id: sessionUser.id,
            isAnonymous: sessionUser.isAnonymous,
            onboardedAt: sessionUser.onboardedAt,
          }
        : null,
    };

    router.update({
      context: {
        ...router.options.context,
        auth: nextAuth,
      },
    });

    if (authGuardChanged(prevAuthRef.current, nextAuth)) {
      router.invalidate();
      prevAuthRef.current = nextAuth;
    }
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
