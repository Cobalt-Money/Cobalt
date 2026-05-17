import { Button } from "@cobalt-web/ui/components/button";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useRef, useState } from "react";

import { importsBaseUrl } from "@/lib/clients/api-client";

import { WizardShell } from "./shell";
import { RESUMABLE_STEP_LABEL, useResumableImports } from "./use-resumable-imports";

export function UploadStep({ onUploaded }: { onUploaded: (jobId: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resumables = useResumableImports();

  const pickFile = (f: File | null | undefined) => {
    if (!f) {
      return;
    }
    const isCsv = f.type === "text/csv" || f.name.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      cobaltToast.error("Only CSV files are supported");
      return;
    }
    setFile(f);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(importsBaseUrl, {
        body: form,
        credentials: "include",
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Upload failed (${String(res.status)})`);
      }
      const data = (await res.json()) as { id: string };
      onUploaded(data.id);
    } catch (error) {
      cobaltToast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const jobs = resumables.data?.jobs ?? [];

  return (
    <WizardShell title="Import transactions" description="Import a CSV from any source.">
      {jobs.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
          <div className="font-medium text-sm">Resume an in-progress import</div>
          <div className="flex flex-col gap-1">
            {jobs.map((j) => (
              <button
                className="flex items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                key={j.id}
                onClick={() => onUploaded(j.id)}
                type="button"
              >
                <span className="truncate font-mono text-xs">{j.originalFilename}</span>
                <span className="ml-3 shrink-0 text-muted-foreground text-xs">
                  {RESUMABLE_STEP_LABEL[j.status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <input
          accept=".csv,text/csv"
          className="sr-only"
          disabled={busy}
          onChange={(e) => pickFile(e.target.files?.[0])}
          ref={inputRef}
          type="file"
        />
        <button
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-12 transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:bg-muted/50",
            busy && "pointer-events-none opacity-60",
          )}
          onClick={() => inputRef.current?.click()}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragOver(false);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files[0]);
          }}
          type="button"
        >
          {file ? (
            <svg
              aria-hidden="true"
              className="size-10 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg
              aria-hidden="true"
              className="size-10 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {file ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className="font-medium text-sm">{file.name}</div>
              <div className="text-muted-foreground text-xs">
                {(file.size / 1024).toFixed(1)} KB — click to replace
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <div className="font-medium text-sm">Drop a CSV here or click to browse</div>
              <div className="text-muted-foreground text-xs">Max 50 MB / 500k rows</div>
            </div>
          )}
        </button>
        <div className="flex justify-end">
          <Button disabled={!file || busy} type="submit">
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </form>
    </WizardShell>
  );
}
