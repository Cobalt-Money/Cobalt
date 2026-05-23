import type { ImportStatusResponse } from "@cobalt-web/server-data/imports/_shared/schemas";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { importsApi } from "@/lib/clients/api-client";

import { useWizardContext } from "./context";
import { AccountMappingStep } from "./account-mapping-step";
import { CategoryMappingStep } from "./category-mapping-step";
import { ColumnMappingStep } from "./column-mapping-step";
import { CommitPreviewStep } from "./commit-preview-step";
import { DiscardJobButton } from "./discard-job-button";
import { WizardShell } from "./shell";
import { CancelledStep, CommittedStep, FailedStep, ProgressStep } from "./terminal-steps";

export const TERMINAL_STATUSES: ReadonlySet<ImportStatusResponse["status"]> = new Set([
  "category_mapped",
  "committing",
  "committed",
  "cancelled",
  "failed",
]);

export const STEP_TITLES: Record<ImportStatusResponse["status"], string> = {
  account_mapped: "Map categories",
  cancelled: "Import cancelled",
  category_mapped: "Review & commit",
  column_mapped: "Map accounts",
  committed: "Import complete",
  committing: "Importing transactions",
  failed: "Import failed",
  uploaded: "Map columns",
};
export const STEP_DESCRIPTIONS: Record<ImportStatusResponse["status"], string> = {
  account_mapped: "Link each source category to a Cobalt category.",
  cancelled: "",
  category_mapped: "Review the import preview before committing.",
  column_mapped: "Match the accounts in your CSV to your Cobalt accounts.",
  committed: "",
  committing: "Inserting rows into your transactions.",
  failed: "",
  uploaded: "Match the columns of your CSV to the Cobalt fields.",
};
export const STEP_SUBTITLES: Partial<Record<ImportStatusResponse["status"], string>> = {
  account_mapped: "You can recategorize and rename categories later in Settings.",
};

export function JobStep({ jobId }: { jobId: string }) {
  const { reportStatus } = useWizardContext();
  const statusQuery = useQuery<ImportStatusResponse>({
    queryFn: async () => {
      const res = await importsApi[":id"].$get({ param: { id: jobId } });
      if (!res.ok) {
        throw new Error("Import job not found");
      }
      return (await res.json()) as ImportStatusResponse;
    },
    queryKey: ["import-job", jobId],
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "committing" ? 1000 : false;
    },
  });

  useEffect(() => {
    reportStatus(statusQuery.data?.status ?? null);
    return () => reportStatus(null);
  }, [reportStatus, statusQuery.data?.status]);

  if (statusQuery.isPending) {
    return (
      <WizardShell title="Loading…">
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      </WizardShell>
    );
  }
  if (statusQuery.isError || !statusQuery.data) {
    return (
      <WizardShell
        title="Import not found"
        description="This import job doesn't exist or isn't yours."
      >
        <div />
      </WizardShell>
    );
  }

  const job = statusQuery.data;
  const canDiscard = job.status !== "committed" && job.status !== "committing";
  return (
    <WizardShell
      title={STEP_TITLES[job.status]}
      description={STEP_DESCRIPTIONS[job.status]}
      subtitle={STEP_SUBTITLES[job.status]}
      headerAction={canDiscard ? <DiscardJobButton jobId={jobId} /> : null}
    >
      {job.status === "uploaded" && <ColumnMappingStep jobId={jobId} />}
      {job.status === "column_mapped" && <AccountMappingStep jobId={jobId} />}
      {job.status === "account_mapped" && <CategoryMappingStep jobId={jobId} />}
      {job.status === "category_mapped" && <CommitPreviewStep job={job} jobId={jobId} />}
      {job.status === "committing" && <ProgressStep job={job} jobId={jobId} />}
      {job.status === "committed" && <CommittedStep job={job} />}
      {job.status === "cancelled" && <CancelledStep job={job} />}
      {job.status === "failed" && <FailedStep job={job} />}
    </WizardShell>
  );
}
