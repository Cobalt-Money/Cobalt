import type {
  AccountSuggestionsResponse,
  ConfirmAccountMappingBody,
} from "@cobalt-web/server-data/import/shared/schemas";
import { InstitutionLogo } from "@cobalt-web/ui/cobalt/logos/institution-logo";
import { CobaltSelectPopover } from "@cobalt-web/ui/cobalt/select-popover";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import { Button } from "@cobalt-web/ui/components/button";
import { Input } from "@cobalt-web/ui/components/input";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { useInstitutionSearch } from "@/components/accounts/use-add-account-flow";
import { useAccounts } from "@/hooks/use-accounts";
import { importsApi } from "@/lib/clients/api-client";

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
  | {
      kind: "create";
      name: string;
      type: AccountType;
      subtype: string;
      institutionName?: string;
      institutionLogoDomain?: string;
    }
  | { kind: "skip" };

export function AccountMappingStep({ jobId }: { jobId: string }) {
  const suggestQuery = useQuery({
    queryFn: async () => {
      const res = await importsApi[":id"]["account-map"].$get({
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to load account suggestions");
      }
      return await res.json();
    },
    queryKey: ["import-job", jobId, "account-map"],
  });

  if (suggestQuery.isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (suggestQuery.isError) {
    return <p className="text-destructive text-sm">{(suggestQuery.error as Error).message}</p>;
  }

  return <AccountMappingStepInner data={suggestQuery.data} jobId={jobId} />;
}

type AccountSuggestion = AccountSuggestionsResponse["suggestions"][number];

/**
 * Build a `LabelChoice` for a kind the user just picked, pre-filling from the AI
 * suggestion where it applies (the user can still override every field).
 */
function choiceForKind(
  label: string,
  kind: LabelChoice["kind"],
  suggestion: AccountSuggestion | undefined,
  fallbackAccountId: string,
): LabelChoice {
  if (kind === "skip") {
    return { kind: "skip" };
  }
  if (kind === "existing") {
    const sugId =
      suggestion && suggestion.target !== "create_new" && suggestion.target !== "skip"
        ? suggestion.target
        : "";
    return { accountId: sugId || fallbackAccountId, kind: "existing" };
  }
  const inferredType = (suggestion?.suggestedType ?? "depository") as AccountType;
  const allowed = SUBTYPES[inferredType];
  const inferredSubtype =
    suggestion?.suggestedSubtype && allowed.includes(suggestion.suggestedSubtype)
      ? suggestion.suggestedSubtype
      : (allowed[0] ?? "Checking");
  return {
    institutionLogoDomain: suggestion?.suggestedInstitutionDomain,
    institutionName: suggestion?.suggestedInstitutionName,
    kind: "create",
    name: suggestion?.newName ?? label,
    subtype: inferredSubtype,
    type: inferredType,
  };
}

const ACCOUNT_KIND_OPTIONS: { kind: LabelChoice["kind"]; label: string }[] = [
  { kind: "existing", label: "Existing account" },
  { kind: "create", label: "New account" },
  { kind: "skip", label: "Don't import" },
] as const;

// Surfaced in the institution picker when the search box is empty — top US
// retail-bank brands so users almost never have to type. `id` is a synthetic
// prefix to avoid colliding with real Plaid institution_ids; the picker uses
// `name` + `url` (logo domain) as the persisted side effect.
const DEFAULT_INSTITUTIONS: readonly {
  id: string;
  name: string;
  logo: null;
  url: string;
}[] = [
  { id: "default:chase", logo: null, name: "Chase", url: "chase.com" },
  {
    id: "default:bofa",
    logo: null,
    name: "Bank of America",
    url: "bankofamerica.com",
  },
  {
    id: "default:wells",
    logo: null,
    name: "Wells Fargo",
    url: "wellsfargo.com",
  },
  {
    id: "default:amex",
    logo: null,
    name: "American Express",
    url: "americanexpress.com",
  },
  { id: "default:citi", logo: null, name: "Citi", url: "citi.com" },
  {
    id: "default:cap1",
    logo: null,
    name: "Capital One",
    url: "capitalone.com",
  },
  { id: "default:usbank", logo: null, name: "U.S. Bank", url: "usbank.com" },
  { id: "default:apple", logo: null, name: "Apple Card", url: "apple.com" },
  { id: "default:discover", logo: null, name: "Discover", url: "discover.com" },
  { id: "default:ally", logo: null, name: "Ally", url: "ally.com" },
  { id: "default:sofi", logo: null, name: "SoFi", url: "sofi.com" },
  {
    id: "default:schwab",
    logo: null,
    name: "Charles Schwab",
    url: "schwab.com",
  },
  { id: "default:fidelity", logo: null, name: "Fidelity", url: "fidelity.com" },
  { id: "default:vanguard", logo: null, name: "Vanguard", url: "vanguard.com" },
  {
    id: "default:robinhood",
    logo: null,
    name: "Robinhood",
    url: "robinhood.com",
  },
];

function naturalKind(s: AccountSuggestion): LabelChoice["kind"] {
  if (s.target === "create_new") {
    return "create";
  }
  if (s.target === "skip") {
    return "skip";
  }
  return "existing";
}

/** Seed every label's choice from its AI suggestion so the pills land pre-selected. */
function seedAccountChoices(
  suggestions: AccountSuggestionsResponse["suggestions"],
): Record<string, LabelChoice> {
  const seeded: Record<string, LabelChoice> = {};
  for (const s of suggestions) {
    seeded[s.sourceLabel] = choiceForKind(s.sourceLabel, naturalKind(s), s, "");
  }
  return seeded;
}

function isChoiceResolved(c: LabelChoice | undefined): boolean {
  if (!c) {
    return false;
  }
  if (c.kind === "create") {
    return c.name.trim().length > 0;
  }
  if (c.kind === "existing") {
    return c.accountId.length > 0;
  }
  return true;
}

function AccountMappingStepInner({
  data,
  jobId,
}: {
  data: AccountSuggestionsResponse;
  jobId: string;
}) {
  const qc = useQueryClient();
  const { items: existingAccounts } = useAccounts();
  // Seeded from the AI suggestions so each account's pills land pre-selected.
  const [choices, setChoices] = useState<Record<string, LabelChoice>>(() =>
    seedAccountChoices(data.suggestions),
  );
  // Drives the institution typeahead inside the "create" branch (one visible at a time).
  const [institutionQuery, setInstitutionQuery] = useState("");
  const institutionSearch = useInstitutionSearch(institutionQuery, true);
  // Default institutions shown when the search box is empty — the user almost
  // always wants one of these, so surfacing them avoids a forced typeahead.
  const institutionItems =
    institutionQuery.trim().length === 0 ? DEFAULT_INSTITUTIONS : (institutionSearch.data ?? []);

  const confirmMut = useMutation({
    mutationFn: async (body: ConfirmAccountMappingBody) => {
      const res = await importsApi[":id"]["account-map"].$post({
        json: body,
        param: { id: jobId },
      });
      if (!res.ok) {
        throw new Error("Failed to confirm account mapping");
      }
      return await res.json();
    },
    onError: (e) => cobaltToast.error(e instanceof Error ? e.message : "Failed"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["import-job", jobId] });
    },
  });

  const labels = data.sourceLabels;
  const suggestionByLabel = new Map(data.suggestions.map((s) => [s.sourceLabel, s]));
  // Progressive disclosure: resolve one source account at a time.
  const [index, setIndex] = useState(0);
  const setKind = (label: string, kind: LabelChoice["kind"]) => {
    const next = choiceForKind(
      label,
      kind,
      suggestionByLabel.get(label),
      existingAccounts[0]?.id ?? "",
    );
    setChoices((p) => ({ ...p, [label]: next }));
  };

  const allResolved = labels.every((l) => isChoiceResolved(choices[l]));

  const onSubmit = () => {
    if (data.path === "B") {
      const c = choices.Default;
      if (!c) {
        return;
      }
      confirmMut.mutate({ choice: c, kind: "single" });
      return;
    }
    confirmMut.mutate({ kind: "perLabel", map: choices });
  };

  const label = labels[index] ?? "";
  const choice = choices[label];
  const isLast = index >= labels.length - 1;
  const currentResolved = isChoiceResolved(choice);

  return (
    <div className="flex flex-col gap-4" key={label}>
      <div className="flex items-baseline gap-2">
        <div className="min-w-0 truncate font-medium text-sm" title={label}>
          {label}
        </div>
        <div className="text-muted-foreground text-xs">
          Account {Math.min(index + 1, labels.length)} of {labels.length}
        </div>
      </div>
      {/* Kind — pre-selected from the AI suggestion; the user can switch it. */}
      <div className="flex flex-wrap gap-1.5">
        {ACCOUNT_KIND_OPTIONS.map((opt) => {
          const active = choice?.kind === opt.kind;
          return (
            <button
              className={cn(
                "inline-flex h-[1.625rem] shrink-0 items-center rounded-full border px-3 text-xs transition-colors",
                active
                  ? "border-foreground/15 bg-input/40 text-foreground"
                  : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
              )}
              key={opt.kind}
              onClick={() => setKind(label, opt.kind)}
              type="button"
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        {choice?.kind === "existing" &&
          (() => {
            const selected = existingAccounts.find((a) => a.id === choice.accountId);
            return (
              <CobaltSelectPopover
                contentClassName="w-72"
                emptyText="No accounts"
                items={existingAccounts}
                itemKey={(a) => a.id}
                itemMatch={(a, q) =>
                  a.institution.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
                }
                onSelect={(a) =>
                  setChoices((p) => ({
                    ...p,
                    [label]: { accountId: a.id, kind: "existing" },
                  }))
                }
                renderIcon={(a) => (
                  <InstitutionLogo
                    className="size-5 rounded-sm"
                    institutionLogo={a.institutionLogo}
                    institutionName={a.institution}
                    institutionUrl={a.institutionUrl}
                  />
                )}
                renderLabel={(a) => (
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{a.description}</span>
                    <span className="truncate text-muted-foreground text-xs">{a.institution}</span>
                  </span>
                )}
                searchPlaceholder="Search accounts…"
                selectedKey={choice.accountId || null}
                trigger={
                  <Button className="w-full justify-start gap-2 rounded-md" variant="outline">
                    {selected ? (
                      <>
                        <InstitutionLogo
                          className="size-5 shrink-0 rounded-sm"
                          institutionLogo={selected.institutionLogo}
                          institutionName={selected.institution}
                          institutionUrl={selected.institutionUrl}
                        />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {selected.description}
                        </span>
                        <span className="shrink-0 text-muted-foreground text-xs">
                          {selected.institution}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Pick an account…</span>
                    )}
                  </Button>
                }
              />
            );
          })()}
        {choice?.kind === "create" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-muted-foreground text-xs">Name</span>
              <Input
                className="w-auto max-w-[60%] rounded-none border-none bg-transparent px-0 text-right shadow-none focus-visible:ring-0 dark:bg-transparent"
                onChange={(e) =>
                  setChoices((p) => ({
                    ...p,
                    [label]: { ...choice, name: e.target.value },
                  }))
                }
                placeholder="Account name"
                value={choice.name}
              />
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 pt-1 text-muted-foreground text-xs">Type</span>
              <div className="flex flex-wrap justify-end gap-1.5">
                {ACCOUNT_TYPES.map((t) => (
                  <button
                    className={cn(
                      "inline-flex h-[1.625rem] shrink-0 items-center rounded-full border px-3 text-xs capitalize transition-colors",
                      choice.type === t
                        ? "border-foreground/15 bg-input/40 text-foreground"
                        : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
                    )}
                    key={t}
                    onClick={() =>
                      setChoices((p) => ({
                        ...p,
                        [label]: {
                          ...choice,
                          subtype: SUBTYPES[t][0] ?? "",
                          type: t,
                        },
                      }))
                    }
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="shrink-0 pt-1 text-muted-foreground text-xs">Subtype</span>
              <div className="flex flex-wrap justify-end gap-1.5">
                {SUBTYPES[choice.type].map((s) => (
                  <button
                    className={cn(
                      "inline-flex h-[1.625rem] shrink-0 items-center rounded-full border px-3 text-xs transition-colors",
                      choice.subtype === s
                        ? "border-foreground/15 bg-input/40 text-foreground"
                        : "border-foreground/15 bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
                    )}
                    key={s}
                    onClick={() =>
                      setChoices((p) => ({
                        ...p,
                        [label]: { ...choice, subtype: s },
                      }))
                    }
                    type="button"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-muted-foreground text-xs">Institution</span>
              <div className="w-[60%] min-w-0">
                <CobaltSelectPopover
                  contentClassName="w-72"
                  emptyText="Type to search…"
                  itemKey={(i) => i.id}
                  items={institutionItems}
                  onQueryChange={setInstitutionQuery}
                  onSelect={(i) =>
                    setChoices((p) => ({
                      ...p,
                      [label]: {
                        ...choice,
                        institutionLogoDomain: i.url ?? undefined,
                        institutionName: i.name,
                      },
                    }))
                  }
                  onUseCustom={(name) =>
                    setChoices((p) => ({
                      ...p,
                      [label]: {
                        ...choice,
                        institutionLogoDomain: undefined,
                        institutionName: name,
                      },
                    }))
                  }
                  renderIcon={(i) => (
                    <InstitutionLogo
                      className="size-5 rounded-sm"
                      institutionLogo={i.logo}
                      institutionName={i.name}
                      institutionUrl={i.url}
                    />
                  )}
                  renderLabel={(i) => <span className="truncate">{i.name}</span>}
                  searchPlaceholder="Search institution…"
                  trigger={
                    <Button className="w-full justify-start gap-2 rounded-md" variant="outline">
                      {choice.institutionName ? (
                        <>
                          <InstitutionLogo
                            className="size-5 shrink-0 rounded-sm"
                            institutionLogo={null}
                            institutionName={choice.institutionName}
                            institutionUrl={choice.institutionLogoDomain ?? null}
                          />
                          <span className="min-w-0 flex-1 truncate text-left">
                            {choice.institutionName}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Pick an institution…</span>
                      )}
                    </Button>
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <Button
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          variant="outline"
        >
          Back
        </Button>
        {isLast ? (
          <Button disabled={!allResolved || confirmMut.isPending} onClick={onSubmit}>
            {confirmMut.isPending ? "Saving…" : "Continue"}
          </Button>
        ) : (
          <Button
            disabled={!currentResolved}
            onClick={() => setIndex((i) => Math.min(labels.length - 1, i + 1))}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
