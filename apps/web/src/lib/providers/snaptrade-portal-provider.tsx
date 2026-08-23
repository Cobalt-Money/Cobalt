import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

const SnapTradePortal = lazy(async () => {
  const { SnapTradeReact } = await import("snaptrade-react");
  return { default: SnapTradeReact };
});

interface PortalOptions {
  onSuccess?: (authorizationId: string) => void;
}

interface SnaptradePortalContextValue {
  openSnaptradePortal: (loginLink: string, options?: PortalOptions) => void;
}

interface PortalSession extends PortalOptions {
  loginLink: string;
}

const SnaptradePortalContext = createContext<SnaptradePortalContextValue | null>(null);

export function SnaptradePortalProvider({ children }: { children: ReactNode }) {
  const [portalSession, setPortalSession] = useState<PortalSession | null>(null);

  const closePortal = useCallback(() => {
    setPortalSession(null);
  }, []);

  const openSnaptradePortal = useCallback((loginLink: string, options?: PortalOptions) => {
    setPortalSession({ loginLink, onSuccess: options?.onSuccess });
  }, []);

  const value = useMemo(() => ({ openSnaptradePortal }), [openSnaptradePortal]);

  return (
    <SnaptradePortalContext.Provider value={value}>
      {children}
      {portalSession ? (
        <Suspense fallback={null}>
          <SnapTradePortal
            close={closePortal}
            contentLabel="Connect brokerage account"
            isOpen
            loginLink={portalSession.loginLink}
            onError={(error) => {
              closePortal();
              toast.error(error.detail || "Could not connect brokerage account");
            }}
            onExit={closePortal}
            onSuccess={(authorizationId) => {
              closePortal();
              portalSession.onSuccess?.(authorizationId);
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
