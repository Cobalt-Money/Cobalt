import { env } from "@cobalt-web/env/web";
import { cn } from "@cobalt-web/ui/lib/utils";
import { mutators, schema } from "@cobalt-web/zero";
import type { Context } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { ZeroProvider as BaseZeroProvider } from "@rocicorp/zero/react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { LoadingSpinner } from "@/components/feedback/loading-spinner";

import { registerActiveZeroForLogout } from "../zero-logout";
import { useAppSession } from "./app-session";

const cacheURL = env.VITE_ZERO_CACHE_URL ?? "http://localhost:4848";

/** Matches zbugs `Root` state + page `onReady` — gates the blocking shell until the active route signals readiness. */
interface ContentReadyContextValue {
  contentReady: boolean;
  onReady: () => void;
}

const ContentReadyContext = createContext<ContentReadyContextValue | undefined>(
  undefined
);

function useContentReadyContext() {
  const value = useContext(ContentReadyContext);
  if (!value) {
    throw new Error("Content ready hooks must be used within ZeroProvider");
  }
  return value;
}

/** Whether the shell may show main content (zbugs `contentReady`). */
export function useContentReady() {
  return useContentReadyContext().contentReady;
}

/** Callback to invoke when the route is ready to show (zbugs page `onReady`). */
export function useOnReady() {
  return useContentReadyContext().onReady;
}

/**
 * App shell wrapper (see `routes/__root.tsx`), matching ztunes `ZeroInit`.
 * Rocicorp's `ZeroProvider` renders nothing until `Zero` exists — without a shell,
 * that reads as a separate "flash" from Better Auth session resolution. We draw one
 * full-screen blocking layer until Zero is ready **and** `useSession()` has settled
 * (zbugs-style single loading surface + deferred spinner).
 */
export function ZeroProvider({ children }: { children: ReactNode }) {
  const session = useAppSession();
  const [zeroReady, setZeroReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const contentReadyRef = useRef(false);
  const authenticatedUserId = session.data?.user.id;
  const context = useMemo<Context | undefined>(
    () => (authenticatedUserId ? { userId: authenticatedUserId } : undefined),
    [authenticatedUserId]
  );

  useLayoutEffect(() => {
    setZeroReady(false);
    contentReadyRef.current = false;
    setContentReady(false);
  }, [authenticatedUserId]);

  const onReady = useCallback(() => {
    if (contentReadyRef.current) {
      return;
    }
    contentReadyRef.current = true;
    setContentReady(true);
  }, []);

  const mergedInit = useCallback((z: Zero) => {
    setZeroReady(true);
    registerActiveZeroForLogout(z);
  }, []);

  const contentReadyValue = useMemo(
    () => ({
      contentReady,
      onReady,
    }),
    [contentReady, onReady]
  );
  const zeroProviderProps = useMemo(
    () =>
      authenticatedUserId
        ? {
            cacheURL,
            context,
            init: mergedInit,
            mutators,
            schema,
            userID: authenticatedUserId,
          }
        : null,
    [authenticatedUserId, context, mergedInit]
  );

  const blockingShell =
    session.isPending ||
    (authenticatedUserId ? !zeroReady || !contentReady : false);
  const hideChildren = authenticatedUserId
    ? !zeroReady || !contentReady
    : false;

  return (
    <ContentReadyContext.Provider value={contentReadyValue}>
      <>
        {/* Keep mounted; cross-fade instead of unmount to avoid a frame of blank vs content. */}
        <div
          aria-hidden={!blockingShell}
          className={cn(
            "bg-background fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-150 ease-out",
            blockingShell ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        >
          {blockingShell ? <LoadingSpinner embedded /> : null}
        </div>
        {zeroProviderProps ? (
          <BaseZeroProvider {...zeroProviderProps}>
            <div className={hideChildren ? "invisible" : undefined}>
              {children}
            </div>
          </BaseZeroProvider>
        ) : (
          children
        )}
      </>
    </ContentReadyContext.Provider>
  );
}
