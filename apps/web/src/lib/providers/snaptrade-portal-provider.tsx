import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

const SnapTradePortal = lazy(async () => {
  const { SnapTradeReact } = await import("snaptrade-react");
  return { default: SnapTradeReact };
});

interface SnaptradePortalContextValue {
  openSnaptradePortal: (loginLink: string) => void;
}

const SnaptradePortalContext = createContext<SnaptradePortalContextValue | null>(null);

export function SnaptradePortalProvider({ children }: { children: ReactNode }) {
  const [loginLink, setLoginLink] = useState<string | null>(null);

  const closePortal = useCallback(() => {
    setLoginLink(null);
  }, []);

  const openSnaptradePortal = useCallback((nextLoginLink: string) => {
    setLoginLink(nextLoginLink);
  }, []);

  const value = useMemo(() => ({ openSnaptradePortal }), [openSnaptradePortal]);

  return (
    <SnaptradePortalContext.Provider value={value}>
      {children}
      {loginLink ? (
        <Suspense fallback={null}>
          <SnapTradePortal
            close={closePortal}
            contentLabel="Connect brokerage account"
            isOpen
            loginLink={loginLink}
            onError={(error) => {
              closePortal();
              toast.error(error.detail || "Could not connect brokerage account");
            }}
            onExit={closePortal}
            onSuccess={() => {
              closePortal();
              toast.success("Brokerage connection updated");
            }}
            style={{ overlay: { zIndex: 1000 } }}
          />
        </Suspense>
      ) : null}
    </SnaptradePortalContext.Provider>
  );
}

export function useSnaptradePortal(): SnaptradePortalContextValue {
  const context = useContext(SnaptradePortalContext);
  if (!context) {
    throw new Error("useSnaptradePortal must be used inside SnaptradePortalProvider");
  }
  return context;
}
