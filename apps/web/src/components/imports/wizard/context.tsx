import type { ImportStatusResponse } from "@cobalt-web/server-data/imports/_shared/schemas";
import { createContext, useCallback, useContext } from "react";

export interface WizardContextValue {
  open: boolean;
  jobId: string | null;
  currentStatus: ImportStatusResponse["status"] | null;
  setJobId: (id: string | null) => void;
  openWizard: (jobId?: string) => void;
  requestClose: () => void;
  reportStatus: (status: ImportStatusResponse["status"] | null) => void;
  /** Track a background commit so its terminal outcome can be surfaced after the wizard closes. */
  watchCommit: (jobId: string) => void;
}

export const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizardContext(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizardContext must be used inside ImportWizardHost");
  }
  return ctx;
}

export function useOpenImportWizard() {
  const ctx = useContext(WizardContext);
  return useCallback(
    (jobId?: string) => {
      ctx?.openWizard(jobId);
    },
    [ctx],
  );
}
