import { InstitutionLogo } from "@cobalt-web/ui/cobalt/logos/institution-logo";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useDeferredValue, useMemo, useState } from "react";

import {
  MANUAL_CASH_OPTION,
  PLAID_DEFAULT_BANKS,
  PLAID_DEFAULT_CREDIT,
  SNAPTRADE_INSTITUTIONS,
} from "./institution-registry";
import type { AddAccountCategory, AddAccountInstitution } from "./types";

type Filter = "all" | "bank" | "brokerage" | "cash";

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bank", label: "Banks" },
  { id: "brokerage", label: "Brokerage" },
  { id: "cash", label: "Cash" },
];

export interface AddAccountGridProps {
  /** Raw search query (un-debounced). */
  searchQuery: string;
  /** Plaid API search results, already fetched by the parent. */
  plaidInstitutions: readonly {
    id: string;
    name: string;
    logo: string | null;
    url: string | null;
  }[];
  onChoose: (institution: AddAccountInstitution) => void;
  /** Compact mode shrinks padding + logo size for command-palette embedding. */
  compact?: boolean;
}

function categorize(name: string): AddAccountCategory {
  const lower = name.toLowerCase();
  if (
    lower.includes("amex") ||
    lower.includes("american express") ||
    lower.includes("credit") ||
    lower.includes("apple card") ||
    lower.includes("discover")
  ) {
    return "credit";
  }
  return "bank";
}

function emptyNoun(filter: Filter): string {
  if (filter === "bank") {
    return "banks";
  }
  if (filter === "brokerage") {
    return "brokerages";
  }
  if (filter === "cash") {
    return "cash accounts";
  }
  return "institutions";
}

function plaidToAddAccount(p: {
  id: string;
  name: string;
  logo: string | null;
  url: string | null;
}): AddAccountInstitution {
  return {
    categories: [categorize(p.name)],
    id: `plaid:${p.id}`,
    logo: p.logo,
    name: p.name,
    provider: "plaid",
    url: p.url,
  };
}

/**
 * Filter pills + institution grid. No dialog wrapper. Used by both the
 * standalone Add Account dialog and the cmd+k "add-account" sub-page.
 */
export function AddAccountGrid({
  searchQuery,
  plaidInstitutions,
  onChoose,
  compact = false,
}: AddAccountGridProps) {
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const deferredQuery = useDeferredValue(searchQuery);
  const trimmedQuery = deferredQuery.trim().toLowerCase();
  const isSearchActive = trimmedQuery.length > 0;

  const visible = useMemo<AddAccountInstitution[]>(() => {
    const plaidMapped = plaidInstitutions.map(plaidToAddAccount);

    let pool: AddAccountInstitution[];
    if (activeFilter === "all") {
      pool = [
        MANUAL_CASH_OPTION,
        ...SNAPTRADE_INSTITUTIONS,
        ...PLAID_DEFAULT_BANKS,
        ...PLAID_DEFAULT_CREDIT,
        ...plaidMapped,
      ];
    } else if (activeFilter === "bank") {
      pool = [...PLAID_DEFAULT_BANKS, ...PLAID_DEFAULT_CREDIT, ...plaidMapped];
    } else if (activeFilter === "cash") {
      pool = [MANUAL_CASH_OPTION];
    } else {
      pool = [...SNAPTRADE_INSTITUTIONS];
    }

    // Dedupe by id, not name. Same `ins_X` can appear in both bank + credit
    // seed lists (e.g. Discover/Chase/Capital One/Citi) — those are the same
    // Plaid Item, not two tiles.
    const byKey = new Map<string, AddAccountInstitution>();
    for (const i of pool) {
      if (!byKey.has(i.id)) {
        byKey.set(i.id, i);
      }
    }
    const deduped = [...byKey.values()];

    if (isSearchActive) {
      return deduped.filter((i) => i.name.toLowerCase().includes(trimmedQuery)).slice(0, 60);
    }

    return deduped;
  }, [plaidInstitutions, activeFilter, isSearchActive, trimmedQuery]);

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left rail */}
      <nav
        aria-label="Account categories"
        className={cn("flex shrink-0 flex-col gap-1", compact ? "w-36 p-2" : "w-44 p-3")}
      >
        {FILTERS.map((f) => {
          const active = activeFilter === f.id;
          return (
            <button
              className={cn(
                "rounded-md px-3 py-2 text-left font-medium text-sm transition-colors",
                active
                  ? "bg-input/40 text-foreground"
                  : "text-muted-foreground hover:bg-input/20 hover:text-foreground",
              )}
              key={f.id}
              onClick={() => {
                setActiveFilter(f.id);
              }}
              type="button"
            >
              {f.label}
            </button>
          );
        })}
      </nav>

      {/* Right pane */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-y-auto",
          compact ? "no-scrollbar px-4 py-3" : "scrollbar-thin px-5 py-4",
        )}
      >
        {visible.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center text-muted-foreground text-sm">
            {isSearchActive
              ? `No ${emptyNoun(activeFilter)} matching "${searchQuery.trim()}"`
              : "Nothing here yet."}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-x-3 gap-y-5",
              compact
                ? "grid-cols-4 sm:grid-cols-5"
                : "grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7",
            )}
          >
            {visible.map((inst) => (
              <button
                className="group flex flex-col items-center gap-2 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                key={inst.id}
                onClick={() => {
                  onChoose(inst);
                }}
                type="button"
              >
                {inst.provider === "manual" ? (
                  <div
                    className={cn(
                      "flex items-center justify-center overflow-hidden rounded-2xl bg-amber-50 transition-transform group-hover:scale-105",
                      compact ? "size-14" : "size-16",
                    )}
                  >
                    <img alt="" aria-hidden className="size-10" src="/assets/vectors/cash.svg" />
                  </div>
                ) : (
                  <InstitutionLogo
                    className={cn(
                      "overflow-hidden rounded-2xl transition-transform group-hover:scale-105",
                      compact ? "size-14" : "size-16",
                    )}
                    institutionLogo={inst.logo}
                    institutionName={inst.name}
                    institutionUrl={inst.url}
                  />
                )}
                <span className="line-clamp-2 text-center font-medium text-foreground text-xs leading-tight">
                  {inst.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
