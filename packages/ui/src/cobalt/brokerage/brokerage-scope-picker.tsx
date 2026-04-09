import { Button } from "@cobalt-web/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMemo } from "react";

import type { BrokerageRowWithRelations } from "../accounts/lib/map-zero-to-account-cards";

export type BrokerageScope =
  | { type: "all" }
  | { type: "include"; accountIds: readonly string[] };

export interface BrokerageAccountGroup {
  groupKey: string;
  groupLabel: string;
  accounts: readonly BrokerageRowWithRelations[];
}

function maskLast4(accountNumber: string | null | undefined): string | null {
  if (!accountNumber?.trim()) {
    return null;
  }
  const d = accountNumber.replaceAll(/\D/g, "");
  if (d.length < 4) {
    return null;
  }
  return `···${d.slice(-4)}`;
}

/** Group SnapTrade accounts by connection (authorization) for display. */
export function groupBrokerageAccounts(
  rows: readonly BrokerageRowWithRelations[]
): BrokerageAccountGroup[] {
  const bucket = new Map<
    string,
    { groupLabel: string; accounts: BrokerageRowWithRelations[] }
  >();

  for (const row of rows) {
    const auth = row.brokerageAuthorization;
    const groupKey =
      auth?.authorizationId?.trim() ||
      `inst:${(row.institutionName ?? "unknown").trim()}:${auth?.brokerageSlug ?? auth?.brokerage ?? row.id}`;
    const groupLabel = (
      auth?.name?.trim() ||
      auth?.brokerage?.trim() ||
      row.institutionName?.trim() ||
      "Brokerage"
    ).trim();

    const cur = bucket.get(groupKey);
    if (cur) {
      cur.accounts.push(row);
    } else {
      bucket.set(groupKey, { accounts: [row], groupLabel });
    }
  }

  return [...bucket.entries()]
    .map(([groupKey, { groupLabel, accounts }]) => ({
      accounts: [...accounts].toSorted((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? "", undefined, {
          sensitivity: "base",
        })
      ),
      groupKey,
      groupLabel,
    }))
    .toSorted((a, b) =>
      a.groupLabel.localeCompare(b.groupLabel, undefined, {
        sensitivity: "base",
      })
    );
}

function accountRowLabel(row: BrokerageRowWithRelations): string {
  const mask = maskLast4(row.accountNumber);
  const base = row.name?.trim() || row.accountType?.trim() || "Account";
  return mask ? `${base} ${mask}` : base;
}

function scopeSummaryLabel(
  scope: BrokerageScope,
  accounts: readonly BrokerageRowWithRelations[]
): string {
  if (scope.type === "all") {
    return "All accounts";
  }
  const ids = scope.accountIds;
  if (ids.length === 1) {
    const row = accounts.find((a) => a.id === ids[0]);
    return row ? accountRowLabel(row) : "1 account";
  }
  return `${ids.length} accounts`;
}

function isIncluded(scope: BrokerageScope, accountId: string): boolean {
  if (scope.type === "all") {
    return true;
  }
  return scope.accountIds.includes(accountId);
}

function toggleAccount(
  accounts: readonly BrokerageRowWithRelations[],
  scope: BrokerageScope,
  accountId: string
): BrokerageScope {
  const allIds = accounts.map((a) => a.id);
  if (scope.type === "all") {
    const next = allIds.filter((id) => id !== accountId);
    return next.length === 0
      ? { type: "all" }
      : { accountIds: next, type: "include" };
  }
  const set = new Set(scope.accountIds);
  if (set.has(accountId)) {
    set.delete(accountId);
  } else {
    set.add(accountId);
  }
  if (set.size === allIds.length) {
    return { type: "all" };
  }
  if (set.size === 0) {
    const fallback = accounts[0]?.id;
    return fallback
      ? { accountIds: [fallback], type: "include" }
      : { type: "all" };
  }
  return { accountIds: [...set], type: "include" };
}

export function BrokerageScopePicker({
  accounts,
  className,
  scope,
  onScopeChange,
}: {
  accounts: readonly BrokerageRowWithRelations[];
  className?: string;
  scope: BrokerageScope;
  onScopeChange: (next: BrokerageScope) => void;
}) {
  const groups = useMemo(() => groupBrokerageAccounts(accounts), [accounts]);

  if (accounts.length === 0) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex min-h-0 flex-col text-xs",
          className
        )}
      >
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase">
          Accounts
        </p>
        <p className="mt-2 leading-snug">No brokerage accounts linked.</p>
      </div>
    );
  }

  const summary = scopeSummaryLabel(scope, accounts);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className={cn(
              "max-w-[min(15rem,calc(100vw-2.5rem))] justify-between gap-2 font-normal",
              className
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
          "max-h-[min(280px,50vh)] w-[min(17rem,calc(100vw-1.5rem))] min-w-[12.5rem] overflow-y-auto rounded-xl border border-border/50 bg-popover/98 p-1 shadow-md ring-0 backdrop-blur-sm",
          "data-open:zoom-in-100 data-closed:zoom-out-100"
        )}
        side="bottom"
        sideOffset={8}
      >
        <DropdownMenuItem
          className="rounded-lg px-3 py-2.5 text-sm font-medium"
          onClick={() => onScopeChange({ type: "all" })}
        >
          All accounts
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/40" />
        {groups.map((g, i) => (
          <DropdownMenuGroup key={g.groupKey}>
            {i > 0 ? <DropdownMenuSeparator className="bg-border/40" /> : null}
            <DropdownMenuLabel className="px-2 py-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {g.groupLabel}
            </DropdownMenuLabel>
            {g.accounts.map((row) => {
              const { id } = row;
              const included = isIncluded(scope, id);
              return (
                <DropdownMenuCheckboxItem
                  checked={included}
                  className="rounded-lg py-1.5 pr-7 pl-2 text-xs"
                  key={id}
                  onCheckedChange={() => {
                    onScopeChange(toggleAccount(accounts, scope, id));
                  }}
                >
                  <span className="truncate">{accountRowLabel(row)}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
