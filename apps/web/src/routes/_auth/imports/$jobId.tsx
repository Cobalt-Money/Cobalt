import { Button, buttonVariants } from "@cobalt-web/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cobalt-web/ui/components/card";
import { Input } from "@cobalt-web/ui/components/input";
import { Label } from "@cobalt-web/ui/components/label";
import { NativeSelect } from "@cobalt-web/ui/components/native-select";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import type {
  ConfirmAccountMappingBody,
  ConfirmCategoryMappingBody,
  ConfirmColumnMappingBody,
  ImportStatusResponse,
} from "@cobalt-web/server-data/import/shared/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAccounts } from "@/hooks/use-accounts";
import { importsApi } from "@/lib/clients/api-client";

/**
 * SRI-321 import job page — single-route status-machine dispatch.
 *
 * Each `import_job.status` renders a dedicated step component. The page
 * polls status while a workflow runs and immediately advances on confirm
 * via React Query invalidation. Drag-drop column mapping (per the SRI-321
 * design spec) is deferred to a follow-up; this MVP uses NativeSelect
 * pickers, which match the Phase 1a scaffolding style.
 */
export const Route = createFileRoute("/_auth/imports/$jobId")({
  component: ImportJobPage,
  staticData: { title: "Import" },
});

function ImportJobPage() {
  const { jobId } = Route.useParams();
  const statusQuery = useQuery<ImportStatusResponse>({
    queryFn: async () => {
      const res = await importsApi[":id"].$get({ param: { id: jobId } });
      if (!res.ok) throw new Error("Import job not found");
      return (await res.json()) as ImportStatusResponse;
    },
    queryKey: ["import-job", jobId],
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "committing" ? 1000 : false;
    },
  });

  if (statusQuery.isPending) return <Centered><Spinner /></Centered>;
  if (statusQuery.isError || !statusQuery.data) {
    return (
      <Centered>
        <Card><CardHeader>
          <CardTitle>Import not found</CardTitle>
          <CardDescription>This import job doesn&apos;t exist or isn&apos;t yours.</CardDescription>
        </CardHeader></Card>
      </Centered>
    );
  }

  const job = statusQuery.data;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-10">
      {job.status === "uploaded" && <ColumnMappingStep jobId={jobId} />}
      {job.status === "column_mapped" && <AccountMappingStep jobId={jobId} />}
      {job.status === "account_mapped" && <CategoryMappingStep jobId={jobId} />}
      {job.status === "category_mapped" && <CommitPreviewStep job={job} jobId={jobId} />}
      {job.status === "committing" && <ProgressStep job={job} jobId={jobId} />}
      {job.status === "committed" && <CommittedStep job={job} />}
      {job.status === "cancelled" && <CancelledStep job={job} />}
      {job.status === "failed" && <FailedStep job={job} />}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Step 2 — column mapping                                            */
/* ------------------------------------------------------------------ */

const TARGET_FIELDS = [
  "date",
  "amount",
  "merchant",
  "account",
  "category",
  "notes",
  "originalDescription",
  "ignore",
] as const;
type TargetField = (typeof TARGET_FIELDS)[number];

interface ColumnMapState {
  /** Header column → target field. */
  byColumn: Record<string, TargetField>;
  dateFormat: string;
  signConvention: "outflow_negative" | "outflow_positive";
  parensNegative: boolean;
  defaultAccountName: string;
  defaultDate: string;
}

function ColumnMappingStep({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["column-map"].$get({ param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to load column suggestions");
      return await res.json();
    },
    queryKey: ["import-job", jobId, "column-map"],
  });

  const [state, setState] = useState<ColumnMapState | null>(null);
  // Seed state from AI suggestion on first render.
  useMemo(() => {
    if (!suggestQuery.data || state) return;
    const m = suggestQuery.data.mapping;
    const byColumn: Record<string, TargetField> = {};
    for (const h of suggestQuery.data.headers) byColumn[h] = "ignore";
    if (m.date.kind === "column") byColumn[m.date.column] = "date";
    if (m.amount.kind === "signed") byColumn[m.amount.column] = "amount";
    byColumn[m.merchant.column] = "merchant";
    if (m.account) byColumn[m.account.column] = "account";
    if (m.category) byColumn[m.category.column] = "category";
    if (m.notes) byColumn[m.notes.column] = "notes";
    if (m.originalDescription) byColumn[m.originalDescription.column] = "originalDescription";
    setState({
      byColumn,
      dateFormat: m.date.kind === "column" ? m.date.format : "yyyy-MM-dd",
      defaultAccountName: "",
      defaultDate: "",
      parensNegative: m.amount.kind === "signed" ? m.amount.parensNegative : false,
      signConvention: m.amount.kind === "signed" ? m.amount.signConvention : "outflow_negative",
    });
  }, [state, suggestQuery.data]);

  const confirmMut = useMutation({
    mutationFn: async (body: ConfirmColumnMappingBody) => {
      const res = await importsApi[":id"]["column-map"].$post({ json: body, param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to confirm mapping");
      return await res.json();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });

  if (suggestQuery.isPending || !state) {
    return <Card><CardHeader><CardTitle>Inferring columns…</CardTitle></CardHeader><CardContent><Spinner /></CardContent></Card>;
  }
  if (suggestQuery.isError) {
    return <Card><CardHeader><CardTitle>Could not infer columns</CardTitle><CardDescription>{(suggestQuery.error as Error).message}</CardDescription></CardHeader></Card>;
  }
  const headers = suggestQuery.data.headers;
  const sample = suggestQuery.data.sampleRows[0] ?? {};

  const setTarget = (col: string, target: TargetField) =>
    setState((s) => (s ? { ...s, byColumn: { ...s.byColumn, [col]: target } } : s));

  const targetFor = (target: TargetField) =>
    Object.entries(state.byColumn).find(([, t]) => t === target)?.[0] ?? null;

  const required: TargetField[] = ["date", "amount", "merchant"];
  const missing = required.filter((r) => !targetFor(r));
  const hasAccount = targetFor("account");
  const noDate = !targetFor("date");

  const onSubmit = () => {
    const dateCol = targetFor("date");
    const amountCol = targetFor("amount");
    const merchantCol = targetFor("merchant");
    if (!amountCol || !merchantCol) {
      toast.error("Amount and merchant are required");
      return;
    }
    confirmMut.mutate({
      defaultAccountName: hasAccount ? undefined : state.defaultAccountName || "Default",
      defaultDate: noDate ? state.defaultDate : undefined,
      mapping: {
        account: hasAccount ? { column: hasAccount } : null,
        amount: {
          column: amountCol,
          kind: "signed",
          parensNegative: state.parensNegative,
          signConvention: state.signConvention,
        },
        category: targetFor("category") ? { column: targetFor("category") as string } : null,
        confidence: suggestQuery.data.mapping.confidence,
        date: dateCol ? { column: dateCol, format: state.dateFormat, kind: "column" } : { kind: "missing" },
        excludeRule: null,
        merchant: { column: merchantCol },
        notes: targetFor("notes") ? { column: targetFor("notes") as string } : null,
        originalDescription: targetFor("originalDescription") ? { column: targetFor("originalDescription") as string } : null,
        tags: null,
        transferRule: null,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map CSV columns</CardTitle>
        <CardDescription>
          AI suggested a mapping. Adjust below — required fields: date, amount, merchant.
          {suggestQuery.data.fromCache ? " Restored from cache." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {headers.map((h) => (
            <div className="flex items-center gap-3 rounded-md border p-3" key={h}>
              <div className="flex-1">
                <div className="font-medium text-sm">{h}</div>
                <div className="text-muted-foreground text-xs">e.g. {String(sample[h] ?? "")}</div>
              </div>
              <NativeSelect onChange={(e) => setTarget(h, e.target.value as TargetField)} value={state.byColumn[h] ?? "ignore"}>
                {TARGET_FIELDS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </NativeSelect>
            </div>
          ))}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Date format</Label>
              <NativeSelect onChange={(e) => setState((s) => s ? { ...s, dateFormat: e.target.value } : s)} value={state.dateFormat}>
                {["yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "M/d/yyyy"].map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Sign convention</Label>
              <NativeSelect
                onChange={(e) => setState((s) => s ? { ...s, signConvention: e.target.value as "outflow_negative" | "outflow_positive" } : s)}
                value={state.signConvention}
              >
                <option value="outflow_negative">Outflows are negative</option>
                <option value="outflow_positive">Outflows are positive</option>
              </NativeSelect>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={state.parensNegative}
              onChange={(e) => setState((s) => s ? { ...s, parensNegative: e.target.checked } : s)}
              type="checkbox"
            />
            Parentheses indicate negative amounts (e.g. "(10.00)" = -10)
          </label>

          {!hasAccount && (
            <div className="flex flex-col gap-2">
              <Label>Default account label (no account column found)</Label>
              <Input
                onChange={(e) => setState((s) => s ? { ...s, defaultAccountName: e.target.value } : s)}
                placeholder="e.g. Chase Checking"
                value={state.defaultAccountName}
              />
            </div>
          )}
          {noDate && (
            <div className="flex flex-col gap-2">
              <Label>Default date (no date column found)</Label>
              <Input
                onChange={(e) => setState((s) => s ? { ...s, defaultDate: e.target.value } : s)}
                placeholder="yyyy-MM-dd"
                type="date"
                value={state.defaultDate}
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button disabled={missing.length > 0 || confirmMut.isPending} onClick={onSubmit}>
              {confirmMut.isPending ? "Saving…" : missing.length > 0 ? `Missing: ${missing.join(", ")}` : "Continue"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 — account mapping                                           */
/* ------------------------------------------------------------------ */

const ACCOUNT_TYPES = ["depository", "credit", "investment", "loan"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];
const SUBTYPES: Record<AccountType, readonly string[]> = {
  credit: ["Credit Card", "Line of Credit"],
  depository: ["Checking", "Savings", "Cash"],
  investment: ["Brokerage", "IRA", "Roth IRA", "401k", "HSA", "Crypto"],
  loan: ["Mortgage", "Student", "Auto", "Personal"],
};

type LabelChoice =
  | { kind: "existing"; accountId: string }
  | { kind: "create"; name: string; type: AccountType; subtype: string }
  | { kind: "skip" };

function AccountMappingStep({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const { items: existingAccounts } = useAccounts();
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["account-map"].$get({ param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to load account suggestions");
      return await res.json();
    },
    queryKey: ["import-job", jobId, "account-map"],
  });

  const [choices, setChoices] = useState<Record<string, LabelChoice>>({});

  const confirmMut = useMutation({
    mutationFn: async (body: ConfirmAccountMappingBody) => {
      const res = await importsApi[":id"]["account-map"].$post({ json: body, param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to confirm account mapping");
      return await res.json();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });

  if (suggestQuery.isPending) return <Card><CardHeader><CardTitle>Loading accounts…</CardTitle></CardHeader><CardContent><Spinner /></CardContent></Card>;
  if (suggestQuery.isError) return <Card><CardHeader><CardTitle>Error</CardTitle><CardDescription>{(suggestQuery.error as Error).message}</CardDescription></CardHeader></Card>;

  const data = suggestQuery.data;
  const labels = data.sourceLabels;
  const setKind = (label: string, kind: LabelChoice["kind"]) => {
    setChoices((p) => ({
      ...p,
      [label]: kind === "existing"
        ? { accountId: existingAccounts[0]?.id ?? "", kind: "existing" }
        : kind === "create"
          ? { kind: "create", name: label, subtype: SUBTYPES.depository[0] ?? "Checking", type: "depository" }
          : { kind: "skip" },
    }));
  };

  const allResolved = labels.every((l) => {
    const c = choices[l];
    if (!c) return false;
    if (c.kind === "create") return c.name.trim().length > 0;
    if (c.kind === "existing") return c.accountId.length > 0;
    return true;
  });

  const onSubmit = () => {
    if (data.path === "B") {
      const c = choices.Default;
      if (!c) return;
      confirmMut.mutate({ choice: c, kind: "single" });
      return;
    }
    confirmMut.mutate({ kind: "perLabel", map: choices });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.path === "A" ? "Map source accounts" : "Pick target account"}</CardTitle>
        <CardDescription>
          {data.path === "A"
            ? "Match each source-account label to an existing Cobalt account, create a new one, or skip those rows."
            : "All rows in this file land on a single account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          {labels.map((label) => {
            const choice = choices[label] ?? { kind: "skip" as const };
            const suggestion = data.suggestions.find((s) => s.sourceLabel === label);
            return (
              <div className="flex flex-col gap-2 rounded-md border p-3" key={label}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{label}</div>
                  {suggestion && !suggestion.fromCache && (
                    <div className="text-muted-foreground text-xs">AI: {suggestion.target} ({Math.round(suggestion.confidence * 100)}%)</div>
                  )}
                  {suggestion?.fromCache && <div className="text-muted-foreground text-xs">cached</div>}
                </div>
                <NativeSelect onChange={(e) => setKind(label, e.target.value as LabelChoice["kind"])} value={choice.kind}>
                  <option value="skip">Skip rows</option>
                  <option value="existing">Map to existing</option>
                  <option value="create">Create new</option>
                </NativeSelect>
                {choice.kind === "existing" && (
                  <NativeSelect
                    onChange={(e) => setChoices((p) => ({ ...p, [label]: { accountId: e.target.value, kind: "existing" } }))}
                    value={choice.accountId}
                  >
                    {existingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.institution} — {a.description}</option>
                    ))}
                  </NativeSelect>
                )}
                {choice.kind === "create" && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Input
                      onChange={(e) => setChoices((p) => ({ ...p, [label]: { ...choice, name: e.target.value } }))}
                      placeholder="Account name"
                      value={choice.name}
                    />
                    <NativeSelect
                      onChange={(e) => {
                        const t = e.target.value as AccountType;
                        setChoices((p) => ({ ...p, [label]: { ...choice, subtype: SUBTYPES[t][0] ?? "", type: t } }));
                      }}
                      value={choice.type}
                    >
                      {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </NativeSelect>
                    <NativeSelect
                      onChange={(e) => setChoices((p) => ({ ...p, [label]: { ...choice, subtype: e.target.value } }))}
                      value={choice.subtype}
                    >
                      {SUBTYPES[choice.type].map((s) => <option key={s} value={s}>{s}</option>)}
                    </NativeSelect>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button disabled={!allResolved || confirmMut.isPending} onClick={onSubmit}>
              {confirmMut.isPending ? "Saving…" : "Continue"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4 — category mapping                                          */
/* ------------------------------------------------------------------ */

type CategoryChoiceState =
  | { action: "link"; targetCategoryId: string }
  | { action: "linkRename"; targetCategoryId: string; newName: string }
  | { action: "create"; name: string; iconKey: string }
  | { action: "skip" };

function CategoryMappingStep({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["category-map"].$get({ param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to load category suggestions");
      return await res.json();
    },
    queryKey: ["import-job", jobId, "category-map"],
  });

  const [choices, setChoices] = useState<Record<string, CategoryChoiceState>>({});

  const confirmMut = useMutation({
    mutationFn: async (body: ConfirmCategoryMappingBody) => {
      const res = await importsApi[":id"]["category-map"].$post({ json: body, param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to confirm category mapping");
      return await res.json();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });

  if (suggestQuery.isPending) return <Card><CardHeader><CardTitle>Inferring categories…</CardTitle></CardHeader><CardContent><Spinner /></CardContent></Card>;
  if (suggestQuery.isError) return <Card><CardHeader><CardTitle>Error</CardTitle><CardDescription>{(suggestQuery.error as Error).message}</CardDescription></CardHeader></Card>;

  const labels = suggestQuery.data.sourceLabels;
  const allResolved = labels.every((l) => choices[l] !== undefined);

  const onSubmit = () => {
    confirmMut.mutate({ map: choices });
  };

  if (labels.length === 0) {
    // No category column was mapped, or all rows have empty category. Skip step.
    confirmMut.mutate({ map: {} });
    return <Card><CardHeader><CardTitle>No categories to map</CardTitle></CardHeader><CardContent><Spinner /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map source categories</CardTitle>
        <CardDescription>Link each label to a Cobalt category, create a new one, or skip to "uncategorized".</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {labels.map((label) => {
            const choice = choices[label] ?? { action: "skip" as const };
            const suggestion = suggestQuery.data.suggestions.find((s) => s.sourceLabel === label);
            return (
              <div className="flex flex-col gap-2 rounded-md border p-3" key={label}>
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{label}</div>
                  {suggestion && (
                    <div className="text-muted-foreground text-xs">
                      AI: {suggestion.action} {suggestion.targetCategoryId ?? suggestion.newCategory?.name ?? ""}
                    </div>
                  )}
                </div>
                <NativeSelect
                  onChange={(e) => {
                    const action = e.target.value as CategoryChoiceState["action"];
                    setChoices((p) => ({
                      ...p,
                      [label]: action === "link"
                        ? { action: "link", targetCategoryId: suggestion?.targetCategoryId ?? "" }
                        : action === "linkRename"
                          ? { action: "linkRename", newName: label, targetCategoryId: suggestion?.targetCategoryId ?? "" }
                          : action === "create"
                            ? { action: "create", iconKey: "circle-help", name: label }
                            : { action: "skip" },
                    }));
                  }}
                  value={choice.action}
                >
                  <option value="skip">Skip → uncategorized</option>
                  <option value="link">Link to existing</option>
                  <option value="linkRename">Link + rename</option>
                  <option value="create">Create new</option>
                </NativeSelect>
                {(choice.action === "link" || choice.action === "linkRename") && (
                  <Input
                    onChange={(e) => setChoices((p) => ({ ...p, [label]: { ...choice, targetCategoryId: e.target.value } }))}
                    placeholder="Cobalt category UUID"
                    value={choice.targetCategoryId}
                  />
                )}
                {choice.action === "linkRename" && (
                  <Input
                    onChange={(e) => setChoices((p) => ({ ...p, [label]: { ...choice, newName: e.target.value } }))}
                    placeholder="New display name"
                    value={choice.newName}
                  />
                )}
                {choice.action === "create" && (
                  <Input
                    onChange={(e) => setChoices((p) => ({ ...p, [label]: { ...choice, name: e.target.value } }))}
                    placeholder="New category name"
                    value={choice.name}
                  />
                )}
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button disabled={!allResolved || confirmMut.isPending} onClick={onSubmit}>
              {confirmMut.isPending ? "Saving…" : "Continue"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Step 5 — preview + commit + progress                               */
/* ------------------------------------------------------------------ */

function CommitPreviewStep({ job, jobId }: { job: ImportStatusResponse; jobId: string }) {
  const qc = useQueryClient();
  const commitMut = useMutation({
    mutationFn: async () => {
      const res = await importsApi[":id"].commit.$post({ param: { id: jobId } });
      if (!res.ok) throw new Error("Commit failed");
      return await res.json();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Commit failed"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });
  const willImport = job.totalRows - job.rejectedRows;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review & commit</CardTitle>
        <CardDescription>{willImport} rows will import. {job.rejectedRows} skipped (parse errors).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end">
          <Button disabled={commitMut.isPending || willImport === 0} onClick={() => commitMut.mutate()}>
            {commitMut.isPending ? "Starting…" : "Commit import"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressStep({ job, jobId }: { job: ImportStatusResponse; jobId: string }) {
  const qc = useQueryClient();
  const cancelMut = useMutation({
    mutationFn: async () => {
      const res = await importsApi[":id"].cancel.$post({ param: { id: jobId } });
      if (!res.ok) throw new Error("Cancel failed");
      return await res.json();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Cancel failed"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });
  const p = job.progress;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Importing…</CardTitle>
        <CardDescription>
          {p ? `${p.step}: ${String(p.done)} / ${String(p.total)}` : "Starting"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end">
          <Button disabled={cancelMut.isPending} onClick={() => cancelMut.mutate()} variant="destructive">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CommittedStep({ job }: { job: ImportStatusResponse }) {
  const s = job.summary;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import complete</CardTitle>
        <CardDescription>
          {s ? `${String(s.imported)} imported, ${String(s.duplicates)} duplicates, ${String(s.excluded)} excluded.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link className={buttonVariants()} to="/transactions">View transactions</Link>
      </CardContent>
    </Card>
  );
}

function CancelledStep({ job }: { job: ImportStatusResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import cancelled</CardTitle>
        <CardDescription>
          Already-inserted rows were kept. {job.summary?.imported ?? 0} rows imported before cancel.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function FailedStep({ job }: { job: ImportStatusResponse }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import failed</CardTitle>
        <CardDescription>{job.errorMessage ?? "Unknown error."}</CardDescription>
      </CardHeader>
    </Card>
  );
}
