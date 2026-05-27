"use client";

import { Button } from "@cobalt-web/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { InstitutionLogo } from "../logos/institution-logo";

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center text-foreground",
        checked ? "opacity-100" : "opacity-0",
      )}
    >
      <HugeiconsIcon className="size-3.5" icon={Tick02Icon} strokeWidth={2.5} />
    </span>
  );
}

export type AccountScope = { type: "all" } | { type: "include"; accountIds: readonly string[] };

export interface AccountPickerAccount {
  id: string;
  name: string;
  institutionName: string;
  institutionLogo?: string | null;
  institutionLogosExtra?: readonly string[] | null;
  institutionUrl?: string | null;
  /** Optional secondary line, e.g. "Checking" / "Investments". */
  sublabel?: string | null;
}

interface AccountPickerListProps {
  accounts: readonly AccountPickerAccount[];
  scope: AccountScope;
  onScopeChange: (next: AccountScope) => void;
  autoFocusSearch?: boolean;
}

function nextScopeAfterToggle(
  accounts: readonly AccountPickerAccount[],
  scope: AccountScope,
  id: string,
): AccountScope {
  const allIds = accounts.map((a) => a.id);
  if (scope.type === "all") {
    if (allIds.length === 1) {
      return { type: "all" };
    }
    return { accountIds: [id], type: "include" };
  }
  const set = new Set(scope.accountIds);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  if (set.size === 0) {
    return { type: "all" };
  }
  if (set.size === allIds.length) {
    return { type: "all" };
  }
  return { accountIds: [...set], type: "include" };
}

interface InstitutionGroup {
  name: string;
  logo?: string | null;
  logosExtra?: readonly string[] | null;
  url?: string | null;
  accounts: AccountPickerAccount[];
}

function groupByInstitution(accounts: readonly AccountPickerAccount[]): InstitutionGroup[] {
  const map = new Map<string, InstitutionGroup>();
  for (const acc of accounts) {
    const key = acc.institutionName;
    const cur = map.get(key);
    if (cur) {
      cur.accounts.push(acc);
    } else {
      map.set(key, {
        accounts: [acc],
        logo: acc.institutionLogo,
        logosExtra: acc.institutionLogosExtra,
        name: acc.institutionName,
        url: acc.institutionUrl,
      });
    }
  }
  return [...map.values()].toSorted((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function AccountPickerList({
  accounts,
  scope,
  onScopeChange,
  autoFocusSearch = true,
}: AccountPickerListProps) {
  const [query, setQuery] = React.useState("");
  const lowerQuery = query.trim().toLowerCase();

  const filtered = React.useMemo(() => {
    if (!lowerQuery) {
      return accounts;
    }
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(lowerQuery) ||
        a.institutionName.toLowerCase().includes(lowerQuery),
    );
  }, [accounts, lowerQuery]);

  const isAll = scope.type === "all";
  const selectedSet = React.useMemo(
    () => (scope.type === "all" ? null : new Set(scope.accountIds)),
    [scope],
  );

  return (
    <>
      <div className="flex items-center px-2.5 py-1.5">
        <input
          autoFocus={autoFocusSearch}
          className="min-w-0 flex-1 cursor-text bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Search accounts…"
          value={query}
        />
      </div>
      <div className="my-1 h-px bg-border/60" />
      <div className="scrollbar-thin max-h-80 overflow-y-auto">
        {lowerQuery.length === 0 ? (
          <button
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-input/40",
              isAll && "bg-input/30",
            )}
            onClick={() => onScopeChange({ type: "all" })}
            type="button"
          >
            <span className="flex-1 text-foreground">All accounts</span>
            <CheckMark checked={isAll} />
          </button>
        ) : null}
        {filtered.length === 0 ? (
          <div className="px-2.5 py-2 text-center text-muted-foreground text-sm">No accounts</div>
        ) : null}
        {groupByInstitution(filtered).map((g) => (
          <div className="mt-2 first:mt-0" key={g.name}>
            <div className="flex items-center gap-2 px-2.5 py-1">
              <InstitutionLogo
                className="size-4 shrink-0 rounded-full"
                institutionLogo={g.logo}
                institutionLogosExtra={g.logosExtra}
                institutionName={g.name}
                institutionUrl={g.url ?? null}
              />
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {g.name}
              </span>
            </div>
            {g.accounts.map((acc) => {
              const checked = isAll ? true : (selectedSet?.has(acc.id) ?? false);
              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md py-1.5 pr-2.5 pl-7 text-left text-sm transition-colors hover:bg-input/40",
                    checked && !isAll && "bg-input/30",
                  )}
                  key={acc.id}
                  onClick={() => onScopeChange(nextScopeAfterToggle(accounts, scope, acc.id))}
                  type="button"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{acc.name}</p>
                    {acc.sublabel ? (
                      <p className="truncate text-[11px] text-muted-foreground">{acc.sublabel}</p>
                    ) : null}
                  </div>
                  <CheckMark checked={checked} />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

interface AccountPickerProps {
  accounts: readonly AccountPickerAccount[];
  scope: AccountScope;
  onScopeChange: (next: AccountScope) => void;
  trigger?: React.ReactElement;
  align?: "start" | "center" | "end";
  className?: string;
  size?: "sm" | "default";
}

function defaultSummary(scope: AccountScope, accounts: readonly AccountPickerAccount[]): string {
  if (scope.type === "all") {
    return "All accounts";
  }
  if (scope.accountIds.length === 1) {
    const match = accounts.find((a) => a.id === scope.accountIds[0]);
    return match ? match.name : "1 account";
  }
  return `${scope.accountIds.length} accounts`;
}

/**
 * Searchable, toggleable multi-select account picker. Same shape as `TagPicker` —
 * popover + search + flat list with check marks.
 */
export function AccountPicker({
  accounts,
  scope,
  onScopeChange,
  trigger,
  align = "end",
  className,
  size = "default",
}: AccountPickerProps) {
  const [open, setOpen] = React.useState(false);

  if (accounts.length === 0) {
    return null;
  }

  const summary = defaultSummary(scope, accounts);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          trigger ?? (
            <Button
              className={cn(
                "max-w-[min(15rem,calc(100vw-2.5rem))] justify-between gap-2 font-normal",
                className,
              )}
              size={size}
              type="button"
              variant="outline"
            >
              <span className="truncate">{summary}</span>
              <HugeiconsIcon
                className="text-muted-foreground shrink-0"
                icon={ArrowDown01Icon}
                size={size === "sm" ? 16 : 18}
                strokeWidth={2}
              />
            </Button>
          )
        }
      />
      <PopoverContent
        align={align}
        className="w-[min(20rem,calc(100vw-1.5rem))] gap-0 bg-popover p-1 dark:bg-popover"
      >
        <AccountPickerList accounts={accounts} onScopeChange={onScopeChange} scope={scope} />
      </PopoverContent>
    </Popover>
  );
}
