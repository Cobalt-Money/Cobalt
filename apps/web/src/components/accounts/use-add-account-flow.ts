import type { AddAccountInstitution } from "@cobalt-web/ui/cobalt/accounts/add-account-dialog/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type {
  PlaidLinkOnExitMetadata,
  PlaidLinkOnSuccessMetadata,
} from "react-plaid-link";
import { toast } from "sonner";

import {
  institutionsApi,
  plaidApi,
  snaptradeApi,
} from "@/lib/clients/api-client";

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
 * Launcher hook: returns `handleChoose`, which routes the user to either
 * Plaid Link or the SnapTrade connection portal. `onDismiss` is called
 * after a flow is committed (dialog should close, palette should close, etc).
 */
export function useAccountLauncher(onDismiss: () => void) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const pendingPlaidRef = useRef(false);
  const { startOnboarding } = useOnboarding();

  const onPlaidSuccess = useCallback(
    async (publicToken: string, _metadata: PlaidLinkOnSuccessMetadata) => {
      try {
        const res = await plaidApi.linkComplete.$post({
          json: { public_token: publicToken },
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? "Failed to connect account");
        }
        const { runId } = await res.json();
        startOnboarding(runId);
        onDismiss();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to connect account"
        );
      }
    },
    [onDismiss, startOnboarding]
  );

  const onPlaidExit = useCallback(
    (_err: unknown, _metadata: PlaidLinkOnExitMetadata) => {
      pendingPlaidRef.current = false;
    },
    []
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

  const launchPlaid = useCallback(async () => {
    pendingPlaidRef.current = true;
    if (linkToken) {
      return;
    }
    try {
      const res = await plaidApi["create-link-token"].$post();
      if (!res.ok) {
        throw new Error("Failed to start Plaid");
      }
      const { link_token } = await res.json();
      setLinkToken(link_token);
    } catch (error) {
      pendingPlaidRef.current = false;
      toast.error(
        error instanceof Error ? error.message : "Failed to start Plaid Link"
      );
    }
  }, [linkToken]);

  const launchSnaptrade = useCallback(
    async (broker: string) => {
      const loadingId = toast.loading("Opening connection portal…");
      try {
        const res = await snaptradeApi.generateConnectionPortal.$post({
          json: { broker },
        });
        if (!res.ok) {
          throw new Error("Failed to open portal");
        }
        const { redirectURI } = await res.json();
        toast.dismiss(loadingId);
        onDismiss();
        window.location.href = redirectURI;
      } catch (error) {
        toast.dismiss(loadingId);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to open connection portal"
        );
      }
    },
    [onDismiss]
  );

  const handleChoose = useCallback(
    (institution: AddAccountInstitution) => {
      if (institution.provider === "snaptrade" && institution.snaptradeBroker) {
        launchSnaptrade(institution.snaptradeBroker);
        return;
      }
      launchPlaid();
    },
    [launchPlaid, launchSnaptrade]
  );

  return { handleChoose };
}
