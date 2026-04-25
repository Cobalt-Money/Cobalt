import { createContext, useContext } from "react";

/**
 * Bridge for shared UI components (e.g. `AccountConnectionActions`) that need
 * the host app's onboarding progress + typed Hono RPC client. The host app
 * (`apps/web`) renders `<OnboardingHostContext.Provider>` near the root, so
 * `packages/ui` consumers can call `startOnboarding` and `resolveLink`
 * without importing from `apps/web` directly (which they can't).
 *
 * Returns `null` if no provider is mounted — callers should treat the host
 * as a no-op in that case rather than throwing.
 */
export interface OnboardingHost {
  /** Show the onboarding progress card for a workflow run. */
  startOnboarding: (runId: string) => void;
  /**
   * POST `/api/plaid/resolveLink` via the host's typed RPC client. Resolves
   * a parked add-account workflow with either `publicToken` (Plaid onSuccess)
   * or `cancelled: true` (Plaid onExit / abandoned dialog).
   */
  resolveLink: (input: {
    hookToken: string;
    publicToken?: string;
    cancelled?: boolean;
  }) => Promise<void>;
}

export const OnboardingHostContext = createContext<OnboardingHost | null>(null);

export function useOptionalOnboardingHost(): OnboardingHost | null {
  return useContext(OnboardingHostContext);
}
