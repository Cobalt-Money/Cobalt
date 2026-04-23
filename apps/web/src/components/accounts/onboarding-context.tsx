import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

interface OnboardingContextValue {
  onboardingRunId: string | null;
  startOnboarding: (runId: string) => void;
  finishOnboarding: () => void;
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

  const value = useMemo(
    () => ({ finishOnboarding, onboardingRunId, startOnboarding }),
    [onboardingRunId, startOnboarding, finishOnboarding]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
