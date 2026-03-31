import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import { authClient } from "../clients/auth-client";

type AppSession = ReturnType<typeof authClient.useSession>;
const AppSessionContext = createContext<AppSession | undefined>(undefined);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();

  return (
    <AppSessionContext.Provider value={session}>
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const session = useContext(AppSessionContext);
  if (!session) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }
  return session;
}
