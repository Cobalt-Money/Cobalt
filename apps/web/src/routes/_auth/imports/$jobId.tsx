import { Button, buttonVariants } from "@cobalt-web/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cobalt-web/ui/components/card";
import { Input } from "@cobalt-web/ui/components/input";
import { Label } from "@cobalt-web/ui/components/label";
import { NativeSelect } from "@cobalt-web/ui/components/native-select";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { ColumnMappingBoard } from "@cobalt-web/ui/cobalt/imports/column-mapping-board";
import { LabelMappingBoard } from "@cobalt-web/ui/cobalt/imports/label-mapping-board";
import type {
  AccountSuggestionsResponse,
  CategorySuggestionsResponse,
  ColumnMappingResponse,
  ConfirmAccountMappingBody,
  ConfirmCategoryMappingBody,
  ConfirmColumnMappingBody,
  ImportStatusResponse,
} from "@cobalt-web/server-data/import/shared/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  "transactionType",
  "merchant",
  "account",
  "category",
  "tags",
  "notes",
  "name",
  "ignore",
] as const;
type TargetField = (typeof TARGET_FIELDS)[number];

const TARGET_LABELS: Record<TargetField, string> = {
  account: "Account",
  amount: "Amount",
  category: "Category",
  date: "Date",
  ignore: "Ignored",
  merchant: "Merchant",
  name: "Name",
  notes: "Notes",
  tags: "Tags",
  transactionType: "Transaction type",
};
const REQUIRED_TARGETS: readonly TargetField[] = ["date", "amount", "merchant"];

const TARGET_EXAMPLES: Record<TargetField, string> = {
  account: "Chase Checking",
  amount: "14.85",
  category: "Restaurants",
  date: "2026-01-05",
  ignore: "",
  merchant: "Chipotle",
  name: "CHIPOTLE 0123",
  notes: "lunch with team",
  tags: "lunch, work",
  transactionType: "debit",
};

interface ColumnMapState {
  /** Header column → target field. */
  byColumn: Record<string, TargetField>;
  dateFormat: string;
  signConvention: "outflow_negative" | "outflow_positive";
  parensNegative: boolean;
  /** Comma-separated list of cell values that mean "outflow" (e.g. "debit"). */
  debitValuesText: string;
  /** Delimiter used to split the tags cell. */
  tagDelimiter: string;
  defaultAccountName: string;
  defaultDate: string;
}

function ColumnMappingStep({ jobId }: { jobId: string }) {
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["column-map"].$get({ param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to load column suggestions");
      return await res.json();
    },
    queryKey: ["import-job", jobId, "column-map"],
  });

  if (suggestQuery.isPending) {
    return <Card><CardHeader><CardTitle>Inferring columns…</CardTitle></CardHeader><CardContent><Spinner /></CardContent></Card>;
  }
  if (suggestQuery.isError) {
    return <Card><CardHeader><CardTitle>Could not infer columns</CardTitle><CardDescription>{(suggestQuery.error as Error).message}</CardDescription></CardHeader></Card>;
  }
  return <ColumnMappingStepInner data={suggestQuery.data} jobId={jobId} />;
}

function seedColumnMapState(data: ColumnMappingResponse): ColumnMapState {
  const m = data.mapping;
  const byColumn: Record<string, TargetField> = {};
  for (const h of data.headers) byColumn[h] = "ignore";
  if (m.date.kind === "column") byColumn[m.date.column] = "date";
  if (m.amount.kind === "signed") {
    byColumn[m.amount.column] = "amount";
  } else if (m.amount.kind === "magnitude_type") {
    byColumn[m.amount.magnitudeColumn] = "amount";
    byColumn[m.amount.typeColumn] = "transactionType";
  }
  byColumn[m.merchant.column] = "merchant";
  if (m.account) byColumn[m.account.column] = "account";
  if (m.category) byColumn[m.category.column] = "category";
  if (m.notes) byColumn[m.notes.column] = "notes";
  if (m.originalDescription) byColumn[m.originalDescription.column] = "name";
  if (m.tags) byColumn[m.tags.column] = "tags";
  return {
    byColumn,
    dateFormat: m.date.kind === "column" ? m.date.format : "yyyy-MM-dd",
    debitValuesText: m.amount.kind === "magnitude_type" ? m.amount.debitValues.join(", ") : "debit",
    defaultAccountName: "",
    defaultDate: "",
    parensNegative: m.amount.kind === "signed" ? m.amount.parensNegative : false,
    signConvention: m.amount.kind === "signed" ? m.amount.signConvention : "outflow_negative",
    tagDelimiter: m.tags?.delimiter ?? ",",
  };
}

function ColumnMappingStepInner({ data, jobId }: { data: ColumnMappingResponse; jobId: string }) {
  const qc = useQueryClient();
  const [state, setState] = useState<ColumnMapState>(() => seedColumnMapState(data));

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

  const headers = data.headers;
  const sample: Record<string, unknown> = (() => {
    const out: Record<string, unknown> = {};
    for (const h of data.headers) {
      const found = data.sampleRows.find((r) => (r[h] ?? "").trim() !== "");
      out[h] = found ? found[h] : "";
    }
    return out;
  })();

  const setTarget = (col: string, target: TargetField) =>
    setState((s) => ({ ...s, byColumn: { ...s.byColumn, [col]: target } }));

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
    const transactionTypeCol = targetFor("transactionType");
    const tagsCol = targetFor("tags");
    if (!amountCol || !merchantCol) {
      toast.error("Amount and merchant are required");
      return;
    }
    const debitValues = state.debitValuesText
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (transactionTypeCol && debitValues.length === 0) {
      toast.error("Provide at least one debit value (e.g. debit) for the transaction type column");
      return;
    }
    const amountMapping: ConfirmColumnMappingBody["mapping"]["amount"] = transactionTypeCol
      ? {
          debitValues,
          kind: "magnitude_type",
          magnitudeColumn: amountCol,
          typeColumn: transactionTypeCol,
        }
      : {
          column: amountCol,
          kind: "signed",
          parensNegative: state.parensNegative,
          signConvention: state.signConvention,
        };
    confirmMut.mutate({
      defaultAccountName: hasAccount ? undefined : state.defaultAccountName || "Default",
      defaultDate: noDate ? state.defaultDate : undefined,
      mapping: {
        account: hasAccount ? { column: hasAccount } : null,
        amount: amountMapping,
        category: targetFor("category") ? { column: targetFor("category") as string } : null,
        confidence: data.mapping.confidence,
        date: dateCol ? { column: dateCol, format: state.dateFormat, kind: "column" } : { kind: "missing" },
        excludeRule: null,
        merchant: { column: merchantCol },
        notes: targetFor("notes") ? { column: targetFor("notes") as string } : null,
        originalDescription: targetFor("name") ? { column: targetFor("name") as string } : null,
        tags: tagsCol ? { column: tagsCol, delimiter: state.tagDelimiter } : null,
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
          {data.fromCache ? " Restored from cache." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <ColumnMappingBoard
            byColumn={state.byColumn}
            headers={headers}
            onChange={setTarget}
            requiredTargets={REQUIRED_TARGETS}
            sample={sample}
            targetExamples={TARGET_EXAMPLES}
            targetLabels={TARGET_LABELS}
            targets={TARGET_FIELDS}
            unassigned="ignore"
          />

          {!targetFor("transactionType") && (
            <div className="flex flex-col gap-2">
              <Label>Sign convention</Label>
              <NativeSelect
                onChange={(e) => setState((s) => ({ ...s, signConvention: e.target.value as "outflow_negative" | "outflow_positive" }))}
                value={state.signConvention}
              >
                <option value="outflow_negative">Outflows are negative</option>
                <option value="outflow_positive">Outflows are positive</option>
              </NativeSelect>
            </div>
          )}
          {!targetFor("transactionType") && (
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={state.parensNegative}
              onChange={(e) => setState((s) => ({ ...s, parensNegative: e.target.checked }))}
              type="checkbox"
            />
            Parentheses indicate negative amounts (e.g. "(10.00)" = -10)
          </label>
          )}

          {!hasAccount && (
            <div className="flex flex-col gap-2">
              <Label>Default account label (no account column found)</Label>
              <Input
                onChange={(e) => setState((s) => ({ ...s, defaultAccountName: e.target.value }))}
                placeholder="e.g. Chase Checking"
                value={state.defaultAccountName}
              />
            </div>
          )}
          {noDate && (
            <div className="flex flex-col gap-2">
              <Label>Default date (no date column found)</Label>
              <Input
                onChange={(e) => setState((s) => ({ ...s, defaultDate: e.target.value }))}
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
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["account-map"].$get({ param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to load account suggestions");
      return await res.json();
    },
    queryKey: ["import-job", jobId, "account-map"],
  });

  if (suggestQuery.isPending) return <Card><CardHeader><CardTitle>Loading accounts…</CardTitle></CardHeader><CardContent><Spinner /></CardContent></Card>;
  if (suggestQuery.isError) return <Card><CardHeader><CardTitle>Error</CardTitle><CardDescription>{(suggestQuery.error as Error).message}</CardDescription></CardHeader></Card>;

  return <AccountMappingStepInner data={suggestQuery.data} jobId={jobId} />;
}

function seedAccountChoices(suggestions: AccountSuggestionsResponse["suggestions"]): Record<string, LabelChoice> {
  const seeded: Record<string, LabelChoice> = {};
  for (const s of suggestions) {
    if (s.target === "create_new") {
      const inferredType = (s.suggestedType ?? "depository") as AccountType;
      const allowedSubtypes = SUBTYPES[inferredType];
      const inferredSubtype =
        s.suggestedSubtype && allowedSubtypes.includes(s.suggestedSubtype)
          ? s.suggestedSubtype
          : (allowedSubtypes[0] ?? "Checking");
      seeded[s.sourceLabel] = {
        kind: "create",
        name: s.newName ?? s.sourceLabel,
        subtype: inferredSubtype,
        type: inferredType,
      };
    } else if (s.target === "skip") {
      seeded[s.sourceLabel] = { kind: "skip" };
    } else {
      seeded[s.sourceLabel] = { accountId: s.target, kind: "existing" };
    }
  }
  return seeded;
}

function AccountMappingStepInner({ data, jobId }: { data: AccountSuggestionsResponse; jobId: string }) {
  const qc = useQueryClient();
  const { items: existingAccounts } = useAccounts();
  const [choices, setChoices] = useState<Record<string, LabelChoice>>(() => seedAccountChoices(data.suggestions));

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

  const labels = data.sourceLabels;

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

  const suggestionFor = (label: string): string | undefined => {
    const s = data.suggestions.find((x) => x.sourceLabel === label);
    if (!s) return undefined;
    if (s.fromCache) return "cached";
    const pct = Math.round(s.confidence * 100);
    if (s.target === "skip") return `AI: skip (${pct}%)`;
    if (s.target === "create_new") return `AI: create "${s.newName ?? label}" (${pct}%)`;
    const existing = existingAccounts.find((a) => a.id === s.target);
    return `AI: ${existing?.description ?? s.target} (${pct}%)`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.path === "A" ? "Map source accounts" : "Pick target account"}</CardTitle>
        <CardDescription>
          {data.path === "A"
            ? "Drag each source label onto an existing Cobalt account, into Create new, or Skip."
            : "All rows in this file land on a single account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <LabelMappingBoard
            choiceFor={(l) => {
              const c = choices[l];
              if (!c) return undefined;
              if (c.kind === "existing") return { existingId: c.accountId, kind: "existing" };
              return { kind: c.kind };
            }}
            createHeader="Create new account"
            existing={existingAccounts.map((a) => ({
              id: a.id,
              label: a.description,
              sublabel: a.institution,
            }))}
            existingHeader="Existing accounts"
            onAssignCreate={(label) =>
              setChoices((p) => ({
                ...p,
                [label]: {
                  kind: "create",
                  name: label,
                  subtype: SUBTYPES.depository[0] ?? "Checking",
                  type: "depository",
                },
              }))
            }
            onAssignExisting={(label, id) =>
              setChoices((p) => ({ ...p, [label]: { accountId: id, kind: "existing" } }))
            }
            onAssignSkip={(label) => setChoices((p) => ({ ...p, [label]: { kind: "skip" } }))}
            renderCreateConfig={(label) => {
              const choice = choices[label];
              if (choice?.kind !== "create") return null;
              return (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Input
                    onChange={(e) =>
                      setChoices((p) => ({ ...p, [label]: { ...choice, name: e.target.value } }))
                    }
                    placeholder="Account name"
                    value={choice.name}
                  />
                  <NativeSelect
                    onChange={(e) => {
                      const t = e.target.value as AccountType;
                      setChoices((p) => ({
                        ...p,
                        [label]: { ...choice, subtype: SUBTYPES[t][0] ?? "", type: t },
                      }));
                    }}
                    value={choice.type}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    onChange={(e) =>
                      setChoices((p) => ({
                        ...p,
                        [label]: { ...choice, subtype: e.target.value },
                      }))
                    }
                    value={choice.subtype}
                  >
                    {SUBTYPES[choice.type].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              );
            }}
            skipHeader="Skip rows"
            sourceLabels={labels}
            suggestionFor={suggestionFor}
          />
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
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["category-map"].$get({ param: { id: jobId } });
      if (!res.ok) throw new Error("Failed to load category suggestions");
      return await res.json();
    },
    queryKey: ["import-job", jobId, "category-map"],
  });

  if (suggestQuery.isPending) return <Card><CardHeader><CardTitle>Inferring categories…</CardTitle></CardHeader><CardContent><Spinner /></CardContent></Card>;
  if (suggestQuery.isError) return <Card><CardHeader><CardTitle>Error</CardTitle><CardDescription>{(suggestQuery.error as Error).message}</CardDescription></CardHeader></Card>;

  return <CategoryMappingStepInner data={suggestQuery.data} jobId={jobId} />;
}

function formatCategorySuggestion(
  s: CategorySuggestionsResponse["suggestions"][number],
  nameById: Map<string, string>,
): string {
  const pct = ` (${Math.round(s.confidence * 100)}%)`;
  switch (s.action) {
    case "link":
      return `✓ ${nameById.get(s.targetCategoryId ?? "") ?? "Unknown"}${pct}`;
    case "linkRename":
      return `✎ ${nameById.get(s.targetCategoryId ?? "") ?? "Unknown"} → ${s.newName ?? ""}${pct}`;
    case "create":
      return `+ Create "${s.newCategory?.name ?? ""}"${pct}`;
    case "skip":
      return `⊘ Skip${pct}`;
  }
}

function seedChoicesFromSuggestions(
  suggestions: CategorySuggestionsResponse["suggestions"],
): Record<string, CategoryChoiceState> {
  const seed: Record<string, CategoryChoiceState> = {};
  for (const s of suggestions) {
    if (s.action === "link" && s.targetCategoryId) {
      seed[s.sourceLabel] = { action: "link", targetCategoryId: s.targetCategoryId };
    } else if (s.action === "linkRename" && s.targetCategoryId) {
      seed[s.sourceLabel] = { action: "linkRename", newName: s.newName ?? s.sourceLabel, targetCategoryId: s.targetCategoryId };
    } else if (s.action === "create") {
      seed[s.sourceLabel] = { action: "create", iconKey: s.newCategory?.iconKey ?? "circle-help", name: s.newCategory?.name ?? s.sourceLabel };
    } else {
      seed[s.sourceLabel] = { action: "skip" };
    }
  }
  return seed;
}

function CategoryMappingStepInner({ data, jobId }: { data: CategorySuggestionsResponse; jobId: string }) {
  const qc = useQueryClient();
  const [choices, setChoices] = useState<Record<string, CategoryChoiceState>>(() => seedChoicesFromSuggestions(data.suggestions));

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

  const labels = data.sourceLabels;
  const userCategories = data.userCategories;
  const categoryNameById = new Map(userCategories.map((c) => [c.id, c.name] as const));
  const allResolved = labels.every((l) => choices[l] !== undefined);

  const onSubmit = () => {
    confirmMut.mutate({ map: choices });
  };

  if (labels.length === 0) {
    // No category column was mapped, or all rows have empty category. Skip step.
    confirmMut.mutate({ map: {} });
    return <Card><CardHeader><CardTitle>No categories to map</CardTitle></CardHeader><CardContent><Spinner /></CardContent></Card>;
  }

  const suggestionFor = (label: string): string | undefined => {
    const s = data.suggestions.find((x) => x.sourceLabel === label);
    return s ? `AI: ${formatCategorySuggestion(s, categoryNameById)}` : undefined;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map source categories</CardTitle>
        <CardDescription>
          Drag each source label onto a Cobalt category, into Create new, or Skip.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <LabelMappingBoard
            choiceFor={(l) => {
              const c = choices[l];
              if (!c) return undefined;
              if (c.action === "link" || c.action === "linkRename")
                return { existingId: c.targetCategoryId, kind: "existing" };
              if (c.action === "create") return { kind: "create" };
              return { kind: "skip" };
            }}
            createHeader="Create new category"
            existing={userCategories.map((c) => ({ id: c.id, label: c.name }))}
            existingHeader="Existing categories"
            onAssignCreate={(label) =>
              setChoices((p) => ({
                ...p,
                [label]: { action: "create", iconKey: "circle-help", name: label },
              }))
            }
            onAssignExisting={(label, id) =>
              setChoices((p) => ({ ...p, [label]: { action: "link", targetCategoryId: id } }))
            }
            onAssignSkip={(label) =>
              setChoices((p) => ({ ...p, [label]: { action: "skip" } }))
            }
            renderCreateConfig={(label) => {
              const choice = choices[label];
              if (choice?.action !== "create") return null;
              return (
                <Input
                  onChange={(e) =>
                    setChoices((p) => ({ ...p, [label]: { ...choice, name: e.target.value } }))
                  }
                  placeholder="New category name"
                  value={choice.name}
                />
              );
            }}
            skipHeader="Skip → uncategorized"
            sourceLabels={labels}
            suggestionFor={suggestionFor}
          />
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
