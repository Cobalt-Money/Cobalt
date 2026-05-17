import type {
  ColumnMappingResponse,
  ConfirmColumnMappingBody,
} from "@cobalt-web/server-data/import/shared/schemas";
import { ColumnMappingBoard } from "@cobalt-web/ui/cobalt/imports/column-mapping-board";
import { InstitutionLogo } from "@cobalt-web/ui/cobalt/logos/institution-logo";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { Button } from "@cobalt-web/ui/components/button";
import { Input } from "@cobalt-web/ui/components/input";
import { Label } from "@cobalt-web/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cobalt-web/ui/components/select";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useInstitutionSearch } from "@/components/accounts/use-add-account-flow";
import { useAccounts } from "@/hooks/use-accounts";
import { importsApi } from "@/lib/clients/api-client";

import { useWizardContext } from "./context";

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
  byColumn: Record<string, TargetField>;
  dateFormat: string;
  signConvention: "outflow_negative" | "outflow_positive";
  parensNegative: boolean;
  debitValuesText: string;
  tagDelimiter: string;
  defaultAccountName: string;
  defaultDate: string;
}

export function ColumnMappingStep({ jobId }: { jobId: string }) {
  const qc = useQueryClient();
  const { requestClose, setJobId } = useWizardContext();
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["column-map"].$get({ param: { id: jobId } });
      if (!res.ok) {
        throw new Error(
          "We weren't able to detect transactions in this file. Upload a correct file or try renaming the columns.",
        );
      }
      return await res.json();
    },
    queryKey: ["import-job", jobId, "column-map"],
    retry: false,
  });

  // When column inference fails, the job is stuck: re-uploading the same file
  // won't help and the user has no way forward. Delete the job + reset wizard
  // so they can upload a different file.
  const cleanedRef = useRef(false);
  useEffect(() => {
    if (!suggestQuery.isError || cleanedRef.current) {
      return;
    }
    cleanedRef.current = true;
    const msg = (suggestQuery.error as Error).message;
    void (async () => {
      try {
        await importsApi[":id"].$delete({ param: { id: jobId } });
      } catch {
        // best-effort cleanup
      }
      await qc.invalidateQueries({ queryKey: ["resumable-imports"] });
      cobaltToast.error(msg);
      setJobId(null);
      requestClose();
    })();
  }, [jobId, qc, requestClose, setJobId, suggestQuery.error, suggestQuery.isError]);

  if (suggestQuery.isPending || suggestQuery.isError) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <ColumnMappingStepInner data={suggestQuery.data} jobId={jobId} />;
}

interface InstitutionValue {
  name: string;
  logoDomain?: string;
}

function InstitutionTypeahead({
  onChange,
  placeholder = "Institution (optional, e.g. Wells Fargo)",
  value,
}: {
  onChange: (v: InstitutionValue) => void;
  placeholder?: string;
  value: InstitutionValue;
}) {
  const [open, setOpen] = useState(false);
  const search = useInstitutionSearch(value.name, open && value.name.length > 0);
  const results = search.data ?? [];

  return (
    <div className="relative">
      <div className="relative">
        {value.logoDomain && value.name.length > 0 && (
          <InstitutionLogo
            className="absolute top-1/2 left-2.5 size-5 -translate-y-1/2 rounded-sm"
            institutionLogo={null}
            institutionName={value.name}
            institutionUrl={value.logoDomain}
          />
        )}
        <Input
          className={cn(value.logoDomain && value.name.length > 0 && "pl-9")}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            onChange({ logoDomain: undefined, name: e.target.value });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          value={value.name}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          <div className="max-h-64 overflow-y-auto py-1">
            {results.slice(0, 8).map((inst) => (
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                key={inst.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange({ logoDomain: inst.url ?? undefined, name: inst.name });
                  setOpen(false);
                }}
                type="button"
              >
                <InstitutionLogo
                  className="size-5 shrink-0 rounded-sm"
                  institutionLogo={inst.logo}
                  institutionName={inst.name}
                  institutionUrl={inst.url}
                />
                <span className="truncate">{inst.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountGateStep({
  accountCol,
  existingAccounts,
  onConfirmAccountColumn,
  onPickSingleAccount,
  sampleValues,
}: {
  accountCol: string | null;
  existingAccounts: { id: string; description: string; institution: string }[];
  onConfirmAccountColumn: () => void;
  onPickSingleAccount: (choice: SingleAccountChoice) => void;
  sampleValues: string[];
}) {
  const [mode, setMode] = useState<"pick" | "create">("pick");
  const [selectedId, setSelectedId] = useState<string>(existingAccounts[0]?.id ?? "");
  const [newName, setNewName] = useState("");
  const [newInstitution, setNewInstitution] = useState<InstitutionValue>({ name: "" });
  const { requestClose: close } = useWizardContext();

  const submitSingle = () => {
    if (mode === "pick") {
      const acc = existingAccounts.find((a) => a.id === selectedId);
      if (!acc) {
        return;
      }
      onPickSingleAccount({ accountId: acc.id, kind: "existing", name: acc.description });
      return;
    }
    onPickSingleAccount({
      institutionLogoDomain: newInstitution.logoDomain,
      institutionName: newInstitution.name.trim() || undefined,
      kind: "create",
      name: newName.trim(),
    });
  };

  const submitDisabled = mode === "pick" ? selectedId.length === 0 : newName.trim().length === 0;

  return (
    <div className="flex flex-col gap-4">
      {accountCol && (
        <div className="rounded-md border p-3">
          <div className="text-sm">
            <span className="font-medium">We found an account column:</span> {accountCol}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sampleValues.length === 0 ? (
              <span className="text-muted-foreground text-xs italic">no values</span>
            ) : (
              sampleValues.map((v) => (
                <span
                  className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-primary text-xs"
                  key={v}
                >
                  {v}
                </span>
              ))
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={onConfirmAccountColumn} size="sm">
              Yes, use this column
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-md border p-3">
        <div className="font-medium text-sm">
          {accountCol ? "Or use a single Cobalt account" : "Use a single Cobalt account"}
        </div>
        <div className="flex gap-2 text-sm">
          <button
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs",
              mode === "pick"
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
            onClick={() => setMode("pick")}
            type="button"
          >
            Existing account
          </button>
          <button
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs",
              mode === "create"
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
            onClick={() => setMode("create")}
            type="button"
          >
            Create new
          </button>
        </div>

        {mode === "pick" &&
          (existingAccounts.length === 0 ? (
            <div className="text-muted-foreground text-xs italic">
              No existing accounts. Use &quot;Create new&quot; instead.
            </div>
          ) : (
            <Select onValueChange={(v) => setSelectedId(v as string)} value={selectedId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an account…" />
              </SelectTrigger>
              <SelectContent>
                {existingAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.institution} — {a.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

        {mode === "create" && (
          <div className="flex flex-col gap-2">
            <Input
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Account name (e.g. Chase Checking)"
              value={newName}
            />
            <InstitutionTypeahead onChange={setNewInstitution} value={newInstitution} />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={close} variant="outline">
            Cancel
          </Button>
          <Button disabled={submitDisabled} onClick={submitSingle}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

function seedColumnMapState(data: ColumnMappingResponse): ColumnMapState {
  const m = data.mapping;
  const byColumn: Record<string, TargetField> = {};
  for (const h of data.headers) {
    byColumn[h] = "ignore";
  }
  if (m.date.kind === "column") {
    byColumn[m.date.column] = "date";
  }
  if (m.amount.kind === "signed") {
    byColumn[m.amount.column] = "amount";
  } else if (m.amount.kind === "magnitude_type") {
    byColumn[m.amount.magnitudeColumn] = "amount";
    byColumn[m.amount.typeColumn] = "transactionType";
  }
  byColumn[m.merchant.column] = "merchant";
  if (m.account) {
    byColumn[m.account.column] = "account";
  }
  if (m.category) {
    byColumn[m.category.column] = "category";
  }
  if (m.notes) {
    byColumn[m.notes.column] = "notes";
  }
  if (m.originalDescription) {
    byColumn[m.originalDescription.column] = "name";
  }
  if (m.tags) {
    byColumn[m.tags.column] = "tags";
  }
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

type SingleAccountChoice =
  | { kind: "existing"; accountId: string; name: string }
  | {
      kind: "create";
      name: string;
      institutionName?: string;
      institutionLogoDomain?: string;
    };

function ColumnMappingStepInner({ data, jobId }: { data: ColumnMappingResponse; jobId: string }) {
  const qc = useQueryClient();
  const { items: existingAccounts } = useAccounts();
  const [state, setState] = useState<ColumnMapState>(() => seedColumnMapState(data));
  const [accountGateAnswered, setAccountGateAnswered] = useState(false);
  const [singleAccountChoice, setSingleAccountChoice] = useState<SingleAccountChoice | null>(null);
  // Set when a confirm staged zero usable rows — surfaced here instead of advancing.
  const [emptyResult, setEmptyResult] = useState<{ rejected: number; staged: number } | null>(null);

  const confirmMut = useMutation({
    mutationFn: async (body: ConfirmColumnMappingBody) => {
      const res = await importsApi[":id"]["column-map"].$post({ json: body, param: { id: jobId } });
      if (!res.ok) {
        throw new Error("Failed to confirm mapping");
      }
      return await res.json();
    },
    onError: (e) => cobaltToast.error(e instanceof Error ? e.message : "Failed"),
    onSuccess: async (result) => {
      // Early surface: a mapping that produces no usable rows (e.g. an essential
      // column is entirely empty) should stop here, not walk the user through the
      // rest of the wizard for nothing.
      if (result.staged === 0) {
        setEmptyResult({ rejected: result.rejected, staged: result.staged });
        cobaltToast.error(
          "This mapping produced no usable rows — check the date, amount, and merchant columns.",
        );
        return;
      }
      setEmptyResult(null);
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });

  const { headers } = data;
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
      cobaltToast.error("Amount and merchant are required");
      return;
    }
    const debitValues = state.debitValuesText
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (transactionTypeCol && debitValues.length === 0) {
      cobaltToast.error(
        "Provide at least one debit value (e.g. debit) for the transaction type column",
      );
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
    const resolvedSingleAccountChoice: ConfirmColumnMappingBody["singleAccountChoice"] =
      hasAccount || !singleAccountChoice
        ? undefined
        : buildSingleAccountChoice(singleAccountChoice);
    confirmMut.mutate({
      defaultAccountName: hasAccount ? undefined : state.defaultAccountName || "Default",
      defaultDate: noDate ? state.defaultDate : undefined,
      mapping: {
        account: hasAccount ? { column: hasAccount } : null,
        amount: amountMapping,
        category: targetFor("category") ? { column: targetFor("category") as string } : null,
        confidence: data.mapping.confidence,
        date: dateCol
          ? { column: dateCol, format: state.dateFormat, kind: "column" }
          : { kind: "missing" },
        excludeRule: null,
        merchant: { column: merchantCol },
        notes: targetFor("notes") ? { column: targetFor("notes") as string } : null,
        originalDescription: targetFor("name") ? { column: targetFor("name") as string } : null,
        tags: tagsCol ? { column: tagsCol, delimiter: state.tagDelimiter } : null,
        transferRule: null,
      },
      singleAccountChoice: resolvedSingleAccountChoice,
    });
  };

  const accountCol = hasAccount;
  const accountSampleValues = accountCol
    ? [
        ...new Set(
          data.sampleRows.map((r) => (r[accountCol] ?? "").trim()).filter((v) => v.length > 0),
        ),
      ].slice(0, 5)
    : [];

  if (existingAccounts.length === 0 && !accountGateAnswered) {
    return (
      <AccountGateStep
        accountCol={accountCol}
        existingAccounts={existingAccounts.map((a) => ({
          description: a.description,
          id: a.id,
          institution: a.institution,
        }))}
        onConfirmAccountColumn={() => {
          setSingleAccountChoice(null);
          setAccountGateAnswered(true);
        }}
        onPickSingleAccount={(choice) => {
          setSingleAccountChoice(choice);
          setState((s) => {
            const next: ColumnMapState = {
              ...s,
              byColumn: { ...s.byColumn },
              defaultAccountName: choice.name,
            };
            if (accountCol) {
              next.byColumn[accountCol] = "ignore";
            }
            return next;
          });
          setAccountGateAnswered(true);
        }}
        sampleValues={accountSampleValues}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ColumnMappingBoard
        byColumn={state.byColumn}
        headers={headers}
        lockedSlots={
          state.defaultAccountName
            ? {
                account: {
                  onClear: () => {
                    setState((s) => ({ ...s, defaultAccountName: "" }));
                    setAccountGateAnswered(false);
                  },
                  value: state.defaultAccountName,
                },
              }
            : undefined
        }
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
          <Select
            onValueChange={(v) =>
              setState((s) => ({
                ...s,
                signConvention: v as "outflow_negative" | "outflow_positive",
              }))
            }
            value={state.signConvention}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outflow_negative">Outflows are negative</SelectItem>
              <SelectItem value="outflow_positive">Outflows are positive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {!targetFor("transactionType") && (
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={state.parensNegative}
            onChange={(e) => setState((s) => ({ ...s, parensNegative: e.target.checked }))}
            type="checkbox"
          />
          Parentheses indicate negative amounts (e.g. &quot;(10.00)&quot; = -10)
        </label>
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

      {emptyResult && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-destructive text-sm">
          This mapping produced no usable rows
          {emptyResult.rejected > 0 ? ` (${emptyResult.rejected} rejected)` : ""}. Re-check the
          date, amount, and merchant columns, then try again.
        </div>
      )}

      <div className="flex justify-end">
        <Button disabled={missing.length > 0 || confirmMut.isPending} onClick={onSubmit}>
          {columnContinueLabel(confirmMut.isPending, missing)}
        </Button>
      </div>
    </div>
  );
}

function buildSingleAccountChoice(
  choice: SingleAccountChoice,
): NonNullable<ConfirmColumnMappingBody["singleAccountChoice"]> {
  if (choice.kind === "existing") {
    return { accountId: choice.accountId, kind: "existing" };
  }
  return {
    institutionLogoDomain: choice.institutionLogoDomain,
    institutionName: choice.institutionName,
    kind: "create",
    name: choice.name,
  };
}

function columnContinueLabel(pending: boolean, missing: readonly string[]): string {
  if (pending) {
    return "Saving…";
  }
  if (missing.length > 0) {
    return `Missing: ${missing.join(", ")}`;
  }
  return "Continue";
}
