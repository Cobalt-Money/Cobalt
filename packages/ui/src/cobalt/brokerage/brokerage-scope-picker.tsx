import { Button } from "@cobalt-web/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";

import { InstitutionLogo } from "../logos/institution-logo";

export type BrokerageScope = { type: "all" } | { type: "include"; accountIds: readonly string[] };

/** Unified account shape for the scope picker — covers both SnapTrade and Plaid sources. */
export interface ScopeAccount {
  id: string;
  displayName: string;
  institutionName: string;
  institutionLogo?: string | null;
  institutionLogosExtra?: readonly string[] | null;
  institutionUrl?: string | null;
}

interface InstitutionGroup {
  accounts: ScopeAccount[];
  logo?: string | null;
  logosExtra?: readonly string[] | null;
  name: string;
  url?: string | null;
}

function groupByInstitution(accounts: readonly ScopeAccount[]): InstitutionGroup[] {
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

function scopeSummaryLabel(scope: BrokerageScope, accounts: readonly ScopeAccount[]): string {
  if (scope.type === "all") {
    return "All accounts";
  }
  const { accountIds } = scope;
  if (accountIds.length === 1) {
    const match = accounts.find((a) => a.id === accountIds[0]);
    return match ? match.displayName : "1 account";
  }
  return `${accountIds.length} accounts`;
}

function isIncluded(scope: BrokerageScope, id: string): boolean {
  if (scope.type === "all") {
    return true;
  }
  return scope.accountIds.includes(id);
}

function isInstitutionActive(scope: BrokerageScope, accounts: ScopeAccount[]): boolean {
  if (scope.type === "all") {
    return true;
  }
  return accounts.every((a) => scope.accountIds.includes(a.id));
}

function toggleInstitution(
  scope: BrokerageScope,
  institutionAccounts: ScopeAccount[],
  allAccounts: readonly ScopeAccount[],
): BrokerageScope {
  const allIds = allAccounts.map((a) => a.id);
  const instIds = new Set(institutionAccounts.map((a) => a.id));

  // From "all", clicking an institution narrows to just that institution rather
  // than de-selecting it out of everything.
  if (scope.type === "all") {
    return instIds.size === allIds.length
      ? { type: "all" }
      : { accountIds: [...instIds], type: "include" };
  }

  const currentIds = new Set(scope.accountIds);

  const allActive = institutionAccounts.every((a) => currentIds.has(a.id));

  let nextIds: Set<string>;
  if (allActive) {
    nextIds = new Set([...currentIds].filter((id) => !instIds.has(id)));
    if (nextIds.size === 0) {
      return { type: "all" };
    }
  } else {
    nextIds = new Set([...currentIds, ...instIds]);
  }

  if (nextIds.size === allIds.length) {
    return { type: "all" };
  }
  return { accountIds: [...nextIds], type: "include" };
}

function toggleAccount(
  accounts: readonly ScopeAccount[],
  scope: BrokerageScope,
  id: string,
): BrokerageScope {
  const allIds = accounts.map((a) => a.id);
  // From "all", clicking an account narrows to just that account rather than
  // de-selecting it out of everything.
  if (scope.type === "all") {
    return allIds.length === 1 ? { type: "all" } : { accountIds: [id], type: "include" };
  }
  const set = new Set(scope.accountIds);
  if (set.has(id)) {
    set.delete(id);
  } else {
    set.add(id);
  }
  if (set.size === allIds.length) {
    return { type: "all" };
  }
  if (set.size === 0) {
    const fallback = accounts[0]?.id;
    return fallback ? { accountIds: [fallback], type: "include" } : { type: "all" };
  }
  return { accountIds: [...set], type: "include" };
}

export function BrokerageScopePicker({
  accounts,
  className,
  onScopeChange,
  scope,
}: {
  accounts: readonly ScopeAccount[];
  className?: string;
  onScopeChange: (next: BrokerageScope) => void;
  scope: BrokerageScope;
}) {
  const groups = useMemo(() => groupByInstitution(accounts), [accounts]);

  if (accounts.length === 0) {
    return (
      <div className={cn("text-muted-foreground flex min-h-0 flex-col text-xs", className)}>
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase">Accounts</p>
        <p className="mt-2 leading-snug">No accounts linked.</p>
      </div>
    );
  }

  const summary = scopeSummaryLabel(scope, accounts);
  const isAll = scope.type === "all";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className={cn(
              "max-w-[min(15rem,calc(100vw-2.5rem))] justify-between gap-2 font-normal",
              className,
            )}
            size="default"
            type="button"
            variant="outline"
          />
        }
      >
        <span className="truncate">{summary}</span>
        <HugeiconsIcon
          className="text-muted-foreground shrink-0"
          icon={ArrowDown01Icon}
          size={18}
          strokeWidth={2}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "max-h-[min(340px,55vh)] w-[min(17rem,calc(100vw-1.5rem))] min-w-[12.5rem] overflow-y-auto rounded-3xl border border-border bg-popover p-1 shadow-xs ring-0 dark:bg-sidebar-accent",
          "data-open:zoom-in-100 data-closed:zoom-out-100",
        )}
        side="bottom"
        sideOffset={8}
      >
        {/* Institution filter chips */}
        <div className="flex flex-wrap gap-1 px-2 pt-2 pb-1">
          <button
            className={cn(
              "inline-flex h-6 cursor-pointer items-center rounded-full border border-border bg-input/30 px-2.5 text-xs transition-colors hover:bg-input/50",
              isAll ? "text-foreground font-medium" : "text-muted-foreground",
            )}
            onClick={() => onScopeChange({ type: "all" })}
            type="button"
          >
            All
          </button>
          {groups.map((g) => {
            const active = isInstitutionActive(scope, g.accounts);
            return (
              <button
                className={cn(
                  "inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border border-border bg-input/30 px-2.5 text-xs transition-colors hover:bg-input/50",
                  active ? "text-foreground font-medium" : "text-muted-foreground",
                )}
                key={g.name}
                onClick={() => onScopeChange(toggleInstitution(scope, g.accounts, accounts))}
                type="button"
              >
                <InstitutionLogo
                  className="size-3.5 shrink-0 rounded-full"
                  institutionLogo={g.logo}
                  institutionLogosExtra={g.logosExtra}
                  institutionName={g.name}
                  institutionUrl={g.url ?? null}
                />
                {g.name}
              </button>
            );
          })}
        </div>
        {/* Individual account checkboxes */}
        {groups.map((g, i) => (
          <DropdownMenuGroup key={g.name}>
            {i > 0 ? <DropdownMenuSeparator className="bg-border/40" /> : null}
            {g.accounts.map((acc) => {
              const included = isIncluded(scope, acc.id);
              return (
                <DropdownMenuCheckboxItem
                  checked={included}
                  className="rounded-lg py-1.5 pr-7 pl-2 text-xs"
                  key={acc.id}
                  onCheckedChange={() => onScopeChange(toggleAccount(accounts, scope, acc.id))}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <InstitutionLogo
                      className="size-5 shrink-0 rounded-full"
                      institutionLogo={acc.institutionLogo}
                      institutionLogosExtra={acc.institutionLogosExtra}
                      institutionName={acc.institutionName}
                      institutionUrl={acc.institutionUrl ?? null}
                    />
                    <span className="truncate">{acc.displayName}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
