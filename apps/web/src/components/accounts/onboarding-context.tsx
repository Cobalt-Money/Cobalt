import { OnboardingHostContext } from "@cobalt-web/ui/cobalt/accounts/onboarding-host";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { plaidApi } from "@/lib/clients/api-client";

interface OnboardingContextValue {
  onboardingRunId: string | null;
  startOnboarding: (runId: string) => void;
  finishOnboarding: () => void;
  resolveLink: (input: {
    hookToken: string;
    publicToken?: string;
    cancelled?: boolean;
  }) => Promise<void>;
}

const STORAGE_KEY = "cobalt:onboardingRunId";

function readStoredRunId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(STORAGE_KEY);
}

function writeStoredRunId(runId: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (runId) {
    window.sessionStorage.setItem(STORAGE_KEY, runId);
  } else {
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error(
      "useOnboarding must be used within OnboardingProgressProvider"
    );
  }
  return ctx;
}

export function OnboardingProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [onboardingRunId, setOnboardingRunId] = useState<string | null>(
    readStoredRunId
  );

  const startOnboarding = useCallback((runId: string) => {
    writeStoredRunId(runId);
    setOnboardingRunId(runId);
  }, []);
  const finishOnboarding = useCallback(() => {
    writeStoredRunId(null);
    setOnboardingRunId(null);
  }, []);

  const resolveLink = useCallback(
    async (input: {
      hookToken: string;
      publicToken?: string;
      cancelled?: boolean;
    }): Promise<void> => {
      const res = await plaidApi.resolveLink.$post({ json: input });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to resume flow");
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      finishOnboarding,
      onboardingRunId,
      resolveLink,
      startOnboarding,
    }),
    [onboardingRunId, startOnboarding, finishOnboarding, resolveLink]
  );

  const hostValue = useMemo(
    () => ({ resolveLink, startOnboarding }),
    [resolveLink, startOnboarding]
  );

  return (
    <OnboardingContext.Provider value={value}>
      <OnboardingHostContext.Provider value={hostValue}>
        {children}
      </OnboardingHostContext.Provider>
    </OnboardingContext.Provider>
  );
}
