import type { ImportStatusResponse } from "@cobalt-web/server-data/imports/_shared/schemas";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { Button } from "@cobalt-web/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@cobalt-web/ui/components/sheet";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { ExpandedPreview } from "@/components/imports/expanded-preview";
import { fireSideCannons } from "@/lib/confetti";
import { importsApi } from "@/lib/clients/api-client";

import { useWizardContext } from "./context";

export interface PreCommitGate {
  blocked: boolean;
  reasons: string[];
  warnings: string[];
}

export function CommitPreviewStep({ job, jobId }: { job: ImportStatusResponse; jobId: string }) {
  const navigate = useNavigate();
  const { requestClose, watchCommit } = useWizardContext();
  const willImport = job.totalRows - job.rejectedRows;
  const [gate, setGate] = useState<PreCommitGate | null>(null);
  const [showExpanded, setShowExpanded] = useState(false);

  const previewQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["staged-preview"].$get({ param: { id: jobId } });
      if (!res.ok) {
        throw new Error("Failed to load preview");
      }
      return await res.json();
    },
    queryKey: ["import-job", jobId, "staged-preview"],
  });
  const previewRows = previewQuery.data?.rows ?? [];

  const commitMut = useMutation({
    mutationFn: async (override: boolean) => {
      const res = await importsApi[":id"].commit.$post({
        json: { override },
        param: { id: jobId },
      });
      // 422 = pre-commit gate blocked or raised warnings; not a hard error.
      if (res.status === 422) {
        return { gate: (await res.json()) as PreCommitGate, ok: false as const };
      }
      if (!res.ok) {
        throw new Error("Commit failed");
      }
      return { ok: true as const };
    },
    onError: (e) => cobaltToast.error(e instanceof Error ? e.message : "Commit failed"),
    onSuccess: (result) => {
      if (!result.ok) {
        setGate(result.gate);
        return;
      }
      setGate(null);
      // Optimistic: fire confetti, close wizard, redirect. Workflow runs server-side;
      // rows stream into /transactions as it finishes.
      // watchCommit polls in the background — surfaces a toast if the workflow ends in `failed`.
      watchCommit(jobId);
      cobaltToast.bulkSuccess(
        `Importing ${String(willImport)} transactions`,
        "Your transactions will appear shortly.",
      );
      fireSideCannons();
      requestClose();
      void navigate({ to: "/transactions" });
    },
  });

  const blocked = gate?.blocked ?? false;
  const hasWarnings = (gate?.warnings.length ?? 0) > 0;
  let commitLabel = "Commit import";
  if (commitMut.isPending) {
    commitLabel = "Starting…";
  } else if (hasWarnings) {
    commitLabel = "Commit anyway";
  }

  return (
    <div className="flex flex-col gap-4">
      {previewRows.length > 0 && (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-muted-foreground text-xs">
              <tr>
                <th className="px-2.5 py-1.5 text-left font-medium">Date</th>
                <th className="px-2.5 py-1.5 text-left font-medium">Merchant</th>
                <th className="px-2.5 py-1.5 text-right font-medium">Amount</th>
                <th className="px-2.5 py-1.5 text-left font-medium">Account</th>
                <th className="px-2.5 py-1.5 text-left font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((r, i) => (
                <tr
                  className="border-b last:border-b-0"
                  key={`${r.date}-${r.merchant}-${String(i)}`}
                >
                  <td className="px-2.5 py-1.5 tabular-nums">{r.date}</td>
                  <td className="max-w-40 truncate px-2.5 py-1.5">{r.merchant}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums">{r.amount}</td>
                  <td className="max-w-32 truncate px-2.5 py-1.5 text-muted-foreground">
                    {r.sourceAccountName}
                  </td>
                  <td className="max-w-32 truncate px-2.5 py-1.5 text-muted-foreground">
                    {r.sourceCategoryName ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        className="self-start text-muted-foreground text-xs hover:text-foreground"
        onClick={() => setShowExpanded(true)}
        type="button"
      >
        View / edit all rows
      </button>
      <Sheet onOpenChange={setShowExpanded} open={showExpanded}>
        <SheetContent
          className="flex w-screen! max-w-none! flex-col bg-popover p-0 pt-12 dark:bg-sidebar-accent"
          side="right"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>All staged rows</SheetTitle>
            <SheetDescription>
              {willImport} importing, {job.rejectedRows} skipped. Edits here are not saved yet.
            </SheetDescription>
          </SheetHeader>
          <ExpandedPreview jobId={jobId} />
        </SheetContent>
      </Sheet>
      {gate && gate.reasons.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <div className="font-medium text-destructive text-sm">Can&apos;t import this file:</div>
          <ul className="mt-1 list-disc pl-5 text-destructive text-sm">
            {gate.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      {gate && hasWarnings && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/5 p-3">
          <div className="font-medium text-sm">Before you continue:</div>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {gate.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end">
        <Button
          disabled={commitMut.isPending || willImport === 0 || blocked}
          onClick={() => commitMut.mutate(hasWarnings)}
        >
          {commitLabel}
        </Button>
      </div>
    </div>
  );
}
