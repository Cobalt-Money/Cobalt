import type { AddAccountInstitution } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/types";
import { KeepAccountsCheckedDialog } from "@cobalt-web/ui/cobalt/accounts/keep-accounts-checked-dialog";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type { PlaidLinkOnExitMetadata, PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { toast } from "sonner";

import { institutionsApi, plaidApi, snaptradeApi } from "@/lib/clients/api-client";
import { handleTierGateResponse } from "@/lib/upgrade-prompt";

import { useOnboarding } from "./onboarding-context";

export interface PlaidInstitution {
  id: string;
  name: string;
  logo: string | null;
  url: string | null;
}

const SEARCH_DEBOUNCE_MS = 250;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(id);
    };
  }, [value, delay]);
  return debouncedValue;
}

/** Fetch Plaid institutions via the server, debounced. */
export function useInstitutionSearch(query: string, enabled: boolean) {
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  return useQuery({
    enabled: enabled && debouncedQuery.trim().length > 0,
    gcTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PlaidInstitution[]> => {
      try {
        const res = await institutionsApi.index.$get({
          query: { query: debouncedQuery },
        });
        if (!res.ok) {
          return [];
        }
        const data = await res.json();
        return data.institutions ?? [];
      } catch {
        return [];
      }
    },
    queryKey: ["institutions", debouncedQuery],
    retry: 1,
    staleTime: 1000 * 60,
  });
}

/**
 * The add-account flow is a single server workflow that starts when the link
 * token is minted and parks on a hook while the user is in Plaid Link. The
 * client's only job after `/createLinkToken` is to report the outcome via
 * `/resolveLink` — `{ publicToken }` on onSuccess, `{ cancelled: true }` on
 * onExit or if the user bails the pre-flight dialog.
 *
 * `resolveLink` is provided by `useOnboarding()` so all three Plaid Link
 * entry points (this hook, notifications-sheet, AccountConnectionActions)
 * share one implementation.
 */

interface PendingSession {
  hookToken: string;
  runId: string;
  linkToken: string;
  updateMode: boolean;
  institutionName: string | null;
  institutionLogo: string | null;
  institutionUrl: string | null;
}

export function useAccountLauncher(onDismiss: () => void) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  // Current in-flight session. Holds the run/hook identifiers so onSuccess and
  // onExit know how to resolve the parked workflow. Null when no flow is open.
  const sessionRef = useRef<PendingSession | null>(null);
  // Separate state for the pre-flight confirm dialog shown in update mode.
  // The workflow is already running at this point; cancelling the dialog
  // must resolve the hook with `cancelled: true` so the run terminates.
  const [pendingConfirm, setPendingConfirm] = useState<PendingSession | null>(null);
  const pendingPlaidRef = useRef(false);
  const { resolveLink, startOnboarding } = useOnboarding();

  const onPlaidSuccess = useCallback(
    async (publicToken: string, _metadata: PlaidLinkOnSuccessMetadata) => {
      const session = sessionRef.current;
      sessionRef.current = null;
      if (!session) {
        return;
      }
      try {
        await resolveLink({ hookToken: session.hookToken, publicToken });
        // Workflow was already started at /createLinkToken. Show the progress
        // card now so the user sees the post-Link sync phases stream in.
        startOnboarding(session.runId);
        onDismiss();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to finish connecting");
      }
    },
    [onDismiss, resolveLink, startOnboarding],
  );

  const onPlaidExit = useCallback(
    (_err: unknown, _metadata: PlaidLinkOnExitMetadata) => {
      pendingPlaidRef.current = false;
      const session = sessionRef.current;
      sessionRef.current = null;
      if (!session) {
        return;
      }
      // User closed Plaid Link — resolve the parked hook so the ghost run
      // terminates cleanly instead of timing out. Best-effort: if this
      // fails, the workflow's own LINK_HOOK_TIMEOUT (5m) will clean up.
      void (async () => {
        try {
          await resolveLink({
            cancelled: true,
            hookToken: session.hookToken,
          });
        } catch {
          // swallow — fallback to server-side timeout.
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
      onDismiss();
      setTimeout(() => {
        openPlaid();
      }, 250);
    }
  }, [plaidReady, linkToken, openPlaid, onDismiss]);

  const launchPlaid = useCallback(
    async (institutionId?: string) => {
      if (linkToken || sessionRef.current) {
        return;
      }
      try {
        const res = await plaidApi.createLinkToken.$post({
          json: { institutionId },
        });
        if (!res.ok) {
          if (await handleTierGateResponse(res)) {
            return;
          }
          throw new Error("Failed to start Plaid");
        }
        const data = await res.json();
        const session: PendingSession = {
          hookToken: data.hookToken,
          institutionLogo: data.institutionLogo ?? null,
          institutionName: data.institutionName ?? null,
          institutionUrl: data.institutionUrl ?? null,
          linkToken: data.link_token,
          runId: data.runId,
          updateMode: data.mode === "update",
        };

        if (session.updateMode) {
          // Gate Plaid Link behind the KeepAccountsCheckedDialog — Plaid's
          // picker can silently deauthorize existing accounts in update mode
          // and our reconcile step cascade-deletes their history. Workflow
          // is already parked on the hook; cancel resolves it.
          setPendingConfirm(session);
          return;
        }

        sessionRef.current = session;
        pendingPlaidRef.current = true;
        setLinkToken(session.linkToken);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start Plaid Link");
      }
    },
    [linkToken],
  );

  const launchSnaptrade = useCallback(
    async (broker: string) => {
      const loadingId = toast.loading("Opening connection portal…");
      try {
        const res = await snaptradeApi.generateConnectionPortal.$post({
          json: { broker },
        });
        if (!res.ok) {
          if (await handleTierGateResponse(res)) {
            toast.dismiss(loadingId);
            return;
          }
          throw new Error("Failed to open portal");
        }
        const { redirectURI } = await res.json();
        toast.dismiss(loadingId);
        onDismiss();
        window.location.href = redirectURI;
      } catch (error) {
        toast.dismiss(loadingId);
        toast.error(error instanceof Error ? error.message : "Failed to open connection portal");
      }
    },
    [onDismiss],
  );

  const handleChoose = useCallback(
    (institution: AddAccountInstitution) => {
      if (institution.provider === "snaptrade" && institution.snaptradeBroker) {
        launchSnaptrade(institution.snaptradeBroker);
        return;
      }
      launchPlaid(institution.id);
    },
    [launchPlaid, launchSnaptrade],
  );

  const confirmUpdate = useCallback(() => {
    if (!pendingConfirm) {
      return;
    }
    sessionRef.current = pendingConfirm;
    pendingPlaidRef.current = true;
    setLinkToken(pendingConfirm.linkToken);
    setPendingConfirm(null);
  }, [pendingConfirm]);

  const cancelUpdate = useCallback(() => {
    const session = pendingConfirm;
    setPendingConfirm(null);
    if (!session) {
      return;
    }
    void (async () => {
      try {
        await resolveLink({
          cancelled: true,
          hookToken: session.hookToken,
        });
      } catch {
        // Best-effort cleanup; server-side timeout is the fallback.
      }
    })();
  }, [pendingConfirm, resolveLink]);

  const updateModeDialog = (
    <KeepAccountsCheckedDialog
      onCancel={cancelUpdate}
      onConfirm={confirmUpdate}
      open={pendingConfirm !== null}
    />
  );

  return { handleChoose, updateModeDialog };
}
