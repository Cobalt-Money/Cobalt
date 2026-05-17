import type { ImportStatusResponse } from "@cobalt-web/server-data/import/shared/schemas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@cobalt-web/ui/components/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useCallback, useState } from "react";

import { WizardContext, useWizardContext } from "./wizard/context";
import type { WizardContextValue } from "./wizard/context";
import { JobStep, TERMINAL_STATUSES } from "./wizard/job-step";
import { UploadStep } from "./wizard/upload-step";
import { useImportFailureWatcher } from "./wizard/use-import-failure-watcher";

export { useOpenImportWizard } from "./wizard/context";
export { WizardShell } from "./wizard/shell";

export function ImportWizardHost({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<ImportStatusResponse["status"] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [watchedJobId, setWatchedJobId] = useState<string | null>(null);

  const watchCommit = useCallback((id: string) => {
    setWatchedJobId(id);
  }, []);

  useImportFailureWatcher(watchedJobId, () => setWatchedJobId(null));

  const openWizard = useCallback((id?: string) => {
    setJobId(id ?? null);
    setCurrentStatus(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setJobId(null);
    setCurrentStatus(null);
    setConfirmOpen(false);
  }, []);

  const isMidFlow =
    jobId !== null && currentStatus !== null && !TERMINAL_STATUSES.has(currentStatus);

  const requestClose = useCallback(() => {
    if (isMidFlow) {
      // First mid-flow close: show the resume-from-⌘K hint dialog. After the
      // user has seen it once, treat further leaves as silent (close immediately).
      const seen =
        typeof window !== "undefined" && window.localStorage.getItem("importHint") === "1";
      if (!seen) {
        setConfirmOpen(true);
        return;
      }
    }
    close();
  }, [close, isMidFlow]);

  const reportStatus = useCallback((status: ImportStatusResponse["status"] | null) => {
    setCurrentStatus(status);
  }, []);

  const value: WizardContextValue = {
    currentStatus,
    jobId,
    open,
    openWizard,
    reportStatus,
    requestClose,
    setJobId: (id) => setJobId(id),
    watchCommit,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            requestClose();
          }
        }}
      >
        {open && <ImportWizardDialogContent />}
      </Dialog>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave import?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress is saved. You can resume from the command menu (⌘K → &quot;Resume&quot;)
              any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("importHint", "1");
                }
                close();
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WizardContext.Provider>
  );
}

function ImportWizardDialogContent() {
  const { currentStatus, jobId, setJobId } = useWizardContext();
  const narrow = currentStatus !== "uploaded";

  return (
    <DialogContent
      className={cn(
        "gap-0 rounded-3xl p-0 dark:bg-sidebar-accent",
        narrow ? "sm:max-w-xl" : "sm:max-w-5xl",
      )}
      overlayClassName="bg-black/25 supports-backdrop-filter:backdrop-blur-none"
      showCloseButton={false}
    >
      <DialogHeader className="sr-only">
        <DialogTitle>Import transactions</DialogTitle>
        <DialogDescription>CSV import wizard.</DialogDescription>
      </DialogHeader>
      {jobId === null ? <UploadStep onUploaded={setJobId} /> : <JobStep jobId={jobId} />}
    </DialogContent>
  );
}
