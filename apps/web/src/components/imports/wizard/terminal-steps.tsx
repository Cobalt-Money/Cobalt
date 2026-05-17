import type { ImportStatusResponse } from "@cobalt-web/server-data/import/shared/schemas";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { Button } from "@cobalt-web/ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { fireSideCannons } from "@/lib/confetti";
import { importsApi } from "@/lib/clients/api-client";

import { useWizardContext } from "./context";

export function ProgressStep({ job, jobId }: { job: ImportStatusResponse; jobId: string }) {
  const qc = useQueryClient();
  const cancelMut = useMutation({
    mutationFn: async () => {
      const res = await importsApi[":id"].cancel.$post({ param: { id: jobId } });
      if (!res.ok) {
        throw new Error("Cancel failed");
      }
      return await res.json();
    },
    onError: (e) => cobaltToast.error(e instanceof Error ? e.message : "Cancel failed"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });
  const p = job.progress;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {p ? `${p.step}: ${String(p.done)} / ${String(p.total)}` : "Starting"}
      </p>
      <div className="flex justify-end">
        <Button
          disabled={cancelMut.isPending}
          onClick={() => cancelMut.mutate()}
          variant="destructive"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function CommittedStep({ job }: { job: ImportStatusResponse }) {
  const navigate = useNavigate();
  const { requestClose } = useWizardContext();
  const fired = useRef(false);
  const s = job.summary;

  useEffect(() => {
    if (fired.current) {
      return;
    }
    fired.current = true;
    const imported = s?.imported ?? 0;
    cobaltToast.bulkSuccess(
      `Imported ${String(imported)} transactions`,
      s ? `${String(s.duplicates)} duplicates skipped, ${String(s.excluded)} excluded.` : undefined,
    );
    fireSideCannons();
    requestClose();
    void navigate({ to: "/transactions" });
  }, [navigate, requestClose, s]);

  return null;
}

export function CancelledStep({ job }: { job: ImportStatusResponse }) {
  return (
    <p className="text-sm">
      Already-inserted rows were kept. {job.summary?.imported ?? 0} rows imported before cancel.
    </p>
  );
}

export function FailedStep({ job }: { job: ImportStatusResponse }) {
  return <p className="text-destructive text-sm">{job.errorMessage ?? "Unknown error."}</p>;
}
