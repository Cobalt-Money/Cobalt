import { Button, buttonVariants } from "@cobalt-web/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@cobalt-web/ui/components/card";
import { Input } from "@cobalt-web/ui/components/input";
import { Label } from "@cobalt-web/ui/components/label";
import { NativeSelect } from "@cobalt-web/ui/components/native-select";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import type {
  AccountMapBody,
  AccountMapEntry,
  ImportStatusResponse,
} from "@cobalt-web/server-data/import/schemas";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAccounts } from "@/hooks/use-accounts";
import { importsApi } from "@/lib/clients/api-client";

export const Route = createFileRoute("/_auth/imports/$jobId")({
  component: ImportJobPage,
  staticData: { title: "Import" },
});

const ACCOUNT_TYPES = ["depository", "credit", "investment", "loan"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];

const SUBTYPES_BY_TYPE: Record<AccountType, readonly string[]> = {
  credit: ["Credit Card", "Line of Credit"],
  depository: ["Checking", "Savings", "Cash"],
  investment: ["Brokerage", "IRA", "Roth IRA", "401k", "HSA", "Crypto"],
  loan: ["Mortgage", "Student", "Auto", "Personal"],
};

function ImportJobPage() {
  const { jobId } = Route.useParams();

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
      return s === "uploaded" || s === "parsed" || s === "mapped" ? 2000 : false;
    },
  });

  if (statusQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (statusQuery.isError || !statusQuery.data) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-8">
        <Card>
          <CardHeader>
            <CardTitle>Import not found</CardTitle>
            <CardDescription>This import job doesn&apos;t exist or isn&apos;t yours.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const job = statusQuery.data;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-10">
      {job.status === "parsed" && (
        <MappingForm currentMapping={job.currentMapping} jobId={jobId} sourceAccounts={job.accounts} />
      )}
      {(job.status === "uploaded" || (job.status === "mapped" && job.dupeCount === 0 && job.importCount === 0)) && (
        <Card>
          <CardHeader>
            <CardTitle>Working…</CardTitle>
            <CardDescription>Deduplicating staged rows. This usually takes a few seconds.</CardDescription>
          </CardHeader>
          <CardContent>
            <Spinner />
          </CardContent>
        </Card>
      )}
      {job.status === "mapped" && (job.dupeCount > 0 || job.importCount > 0) && (
        <PreviewAndCommit dupeCount={job.dupeCount} importCount={job.importCount} jobId={jobId} />
      )}
      {job.status === "committed" && (
        <Card>
          <CardHeader>
            <CardTitle>Import complete</CardTitle>
            <CardDescription>
              {job.importCount} {job.importCount === 1 ? "transaction" : "transactions"} imported.
              {job.dupeCount > 0
                ? ` ${String(job.dupeCount)} duplicates skipped.`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link className={buttonVariants()} to="/transactions">
              View transactions
            </Link>
          </CardContent>
        </Card>
      )}
      {job.status === "failed" && (
        <Card>
          <CardHeader>
            <CardTitle>Import failed</CardTitle>
            <CardDescription>{job.errorMessage ?? "Unknown error."}</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

interface MappingFormProps {
  currentMapping: Record<string, AccountMapEntry> | null;
  jobId: string;
  sourceAccounts: string[];
}

type MappingChoice =
  | { kind: "existing"; accountId: string }
  | { kind: "create"; name: string; subtype: string; type: AccountType }
  | { kind: "skip" }
  | { kind: "unset" };

function MappingForm({ currentMapping, jobId, sourceAccounts }: MappingFormProps) {
  const { isComplete, items: existingAccounts } = useAccounts();

  const [choices, setChoices] = useState<Record<string, MappingChoice>>(() => {
    const seed: Record<string, MappingChoice> = {};
    for (const name of sourceAccounts) {
      const existing = currentMapping?.[name];
      seed[name] = existing
        ? existing.kind === "create"
          ? { kind: "create", name: existing.name, subtype: existing.subtype, type: existing.type }
          : existing.kind === "existing"
            ? { accountId: existing.accountId, kind: "existing" }
            : { kind: "skip" }
        : { kind: "unset" };
    }
    return seed;
  });
  const [busy, setBusy] = useState(false);

  const allResolved = useMemo(
    () =>
      sourceAccounts.every((name) => {
        const c = choices[name];
        if (!c || c.kind === "unset") return false;
        if (c.kind === "create") {
          return c.name.trim().length > 0 && c.subtype.trim().length > 0;
        }
        return true;
      }),
    [choices, sourceAccounts],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allResolved) {
      return;
    }
    setBusy(true);
    try {
      const mapping: AccountMapBody["mapping"] = {};
      for (const name of sourceAccounts) {
        const c = choices[name];
        if (!c || c.kind === "unset") continue;
        if (c.kind === "existing") {
          mapping[name] = { accountId: c.accountId, kind: "existing" };
        } else if (c.kind === "create") {
          mapping[name] = {
            kind: "create",
            name: c.name.trim(),
            subtype: c.subtype.trim(),
            type: c.type,
          };
        } else {
          mapping[name] = { kind: "skip" };
        }
      }
      const res = await importsApi[":id"]["account-map"].$put({
        json: { mapping },
        param: { id: jobId },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to save mapping");
      }
      toast.success("Mapping saved. Deduplicating…");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save mapping");
    } finally {
      setBusy(false);
    }
  };

  if (!isComplete) {
    return <Spinner />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Map source accounts</CardTitle>
        <CardDescription>
          Choose where each Mint account should land in Cobalt. You can map to an existing account,
          create a new manual account, or skip.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-6" onSubmit={onSubmit}>
          {sourceAccounts.map((name) => {
            const choice = choices[name] ?? { kind: "unset" };
            const setKind = (kind: MappingChoice["kind"]) => {
              setChoices((prev) => {
                const next: MappingChoice =
                  kind === "existing"
                    ? { accountId: existingAccounts[0]?.id ?? "", kind: "existing" }
                    : kind === "create"
                      ? {
                          kind: "create",
                          name,
                          subtype: SUBTYPES_BY_TYPE.depository[0] ?? "Checking",
                          type: "depository",
                        }
                      : kind === "skip"
                        ? { kind: "skip" }
                        : { kind: "unset" };
                return { ...prev, [name]: next };
              });
            };

            return (
              <div className="flex flex-col gap-3 rounded-md border p-4" key={name}>
                <div className="font-medium text-sm">{name}</div>
                <div className="flex flex-col gap-2">
                  <Label>Action</Label>
                  <NativeSelect
                    onChange={(e) => setKind(e.target.value as MappingChoice["kind"])}
                    value={choice.kind}
                  >
                    <option value="unset">Choose…</option>
                    <option value="existing">Map to existing account</option>
                    <option value="create">Create new manual account</option>
                    <option value="skip">Skip rows for this account</option>
                  </NativeSelect>
                </div>

                {choice.kind === "existing" && (
                  <div className="flex flex-col gap-2">
                    <Label>Cobalt account</Label>
                    <NativeSelect
                      onChange={(e) =>
                        setChoices((prev) => ({
                          ...prev,
                          [name]: { accountId: e.target.value, kind: "existing" },
                        }))
                      }
                      value={choice.accountId}
                    >
                      {existingAccounts.map((acct) => (
                        <option key={acct.id} value={acct.id}>
                          {acct.institution} — {acct.description} ({acct.mask})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}

                {choice.kind === "create" && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <Label>Name</Label>
                      <Input
                        onChange={(e) =>
                          setChoices((prev) => ({
                            ...prev,
                            [name]: { ...choice, name: e.target.value },
                          }))
                        }
                        value={choice.name}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Type</Label>
                      <NativeSelect
                        onChange={(e) => {
                          const nextType = e.target.value as AccountType;
                          setChoices((prev) => ({
                            ...prev,
                            [name]: {
                              ...choice,
                              subtype: SUBTYPES_BY_TYPE[nextType][0] ?? "",
                              type: nextType,
                            },
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
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Subtype</Label>
                      <NativeSelect
                        onChange={(e) =>
                          setChoices((prev) => ({
                            ...prev,
                            [name]: { ...choice, subtype: e.target.value },
                          }))
                        }
                        value={choice.subtype}
                      >
                        {SUBTYPES_BY_TYPE[choice.type].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-end">
            <Button disabled={!allResolved || busy} type="submit">
              {busy ? "Saving…" : "Continue"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface PreviewAndCommitProps {
  dupeCount: number;
  importCount: number;
  jobId: string;
}

function PreviewAndCommit({ dupeCount, importCount, jobId }: PreviewAndCommitProps) {
  const [busy, setBusy] = useState(false);

  const onCommit = async () => {
    setBusy(true);
    try {
      const res = await importsApi[":id"].commit.$post({ param: { id: jobId } });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Commit failed");
      }
      toast.success("Committing…");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review</CardTitle>
        <CardDescription>
          {importCount} new {importCount === 1 ? "transaction" : "transactions"} will import.
          {dupeCount > 0
            ? ` ${String(dupeCount)} ${dupeCount === 1 ? "duplicate" : "duplicates"} will be skipped.`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end gap-2">
          <Button disabled={busy || importCount === 0} onClick={onCommit}>
            {busy ? "Committing…" : "Commit import"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
