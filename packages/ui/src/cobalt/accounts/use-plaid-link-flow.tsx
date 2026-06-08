import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type { PlaidLinkOnExitMetadata, PlaidLinkOnSuccessMetadata } from "react-plaid-link";

/**
 * Minimal Plaid Link launcher. Apps inject the two server calls — keeps this
 * primitive decoupled from any per-app api-client. Server workflow parks on a
 * hook between /createLinkToken and /resolveLink; client's only job is to
 * report the outcome (`publicToken` on success, `cancelled` on exit) so the
 * parked run terminates promptly instead of hitting the 5m timeout.
 *
 * Skips institution-search (Plaid Link has built-in picker), update-mode
 * confirm dialog, onboarding progress, and tier-gate UX. Web keeps its
 * richer flow; this is the thin shared core.
 */
export interface UsePlaidLinkFlowDeps {
  /** Mint a link token + start the parked workflow. */
  createLinkToken: () => Promise<{ link_token: string; hookToken: string }>;
  /** Resolve the parked hook with the Plaid Link outcome. */
  resolveLink: (args: {
    hookToken: string;
    publicToken?: string;
    cancelled?: boolean;
  }) => Promise<void>;
  /** Fired after a successful link + resolve. Refresh UI here. */
  onSuccess?: () => void;
  /** Error reporter (e.g. sonner `toast.error`). Defaults to console.error. */
  onError?: (message: string) => void;
}

export interface UsePlaidLinkFlowResult {
  /** Launch Plaid Link. No-op if a flow is already in-flight. */
  open: () => void;
  /** True between "+ Add" click and Plaid Link iframe mount (show spinner). */
  opening: boolean;
}

export function usePlaidLinkFlow(deps: UsePlaidLinkFlowDeps): UsePlaidLinkFlowResult {
  const { createLinkToken, resolveLink, onSuccess, onError } = deps;
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const hookTokenRef = useRef<string | null>(null);
  const pendingPlaidRef = useRef(false);

  const reportError = useCallback(
    (message: string) => {
      if (onError) {
        onError(message);
      } else {
        console.error(message);
      }
    },
    [onError],
  );

  const onPlaidSuccess = useCallback(
    async (publicToken: string, _metadata: PlaidLinkOnSuccessMetadata) => {
      const hookToken = hookTokenRef.current;
      hookTokenRef.current = null;
      setLinkToken(null);
      setOpening(false);
      if (!hookToken) {
        return;
      }
      try {
        await resolveLink({ hookToken, publicToken });
        onSuccess?.();
      } catch (error) {
        reportError(error instanceof Error ? error.message : "Failed to finish connecting");
      }
    },
    [resolveLink, onSuccess, reportError],
  );

  const onPlaidExit = useCallback(
    (_err: unknown, _metadata: PlaidLinkOnExitMetadata) => {
      pendingPlaidRef.current = false;
      const hookToken = hookTokenRef.current;
      hookTokenRef.current = null;
      setLinkToken(null);
      setOpening(false);
      if (!hookToken) {
        return;
      }
      // Best-effort: server's LINK_HOOK_TIMEOUT (5m) is the safety net.
      void (async () => {
        try {
          await resolveLink({ cancelled: true, hookToken });
        } catch {
          // swallow
        }
      })();
    },
    [resolveLink],
  );

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    onExit: onPlaidExit,
    onSuccess: onPlaidSuccess,
    token: linkToken,
  });

  useEffect(() => {
    if (pendingPlaidRef.current && plaidReady && linkToken) {
      pendingPlaidRef.current = false;
      // Small defer matches web's pattern — avoids a flash of the iframe
      // before our overlay/spinner unmounts.
      setTimeout(() => {
        openPlaid();
        setOpening(false);
      }, 250);
    }
  }, [plaidReady, linkToken, openPlaid]);

  const open = useCallback(() => {
    if (linkToken || hookTokenRef.current || opening) {
      return;
    }
    setOpening(true);
    void (async () => {
      try {
        const { link_token, hookToken } = await createLinkToken();
        hookTokenRef.current = hookToken;
        pendingPlaidRef.current = true;
        setLinkToken(link_token);
      } catch (error) {
        setOpening(false);
        reportError(error instanceof Error ? error.message : "Failed to start Plaid Link");
      }
    })();
  }, [linkToken, opening, createLinkToken, reportError]);

  return { open, opening };
}
