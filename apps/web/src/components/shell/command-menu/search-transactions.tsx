import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { mapZeroTransactionListRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import type { ZeroTransactionListRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import { getTransactionDisplayName } from "@cobalt-web/ui/cobalt/transactions/lib/helpers";
import { CommandEmpty, CommandGroup, CommandItem } from "@cobalt-web/ui/components/command";
import { Kbd, KbdGroup } from "@cobalt-web/ui/components/kbd";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { zql } from "@cobalt-web/zero";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useCallback, useMemo } from "react";
import type { MouseEvent } from "react";

// ── Shared helpers ────────────────────────────────────────────────────────────

function isCleanLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
}

const ILIKE_WILDCARD = (query: string): string => `%${query}%`;

const parseDate = (date: unknown): Date | null => {
  if (typeof date === "number" || typeof date === "string") {
    return new Date(date);
  }
  return date instanceof Date ? date : null;
};

// ── Formatters ────────────────────────────────────────────────────────────────

const amountFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  style: "currency",
});

const formatAmount = (amount: number | null | undefined): string =>
  amount === null || amount === undefined ? "" : amountFormatter.format(Math.abs(amount));

const formatDate = (date: unknown): string => {
  const parsed = parseDate(date);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
};

// ── ZQL query builders ────────────────────────────────────────────────────────

const buildRecentQuery = () =>
  zql.transaction
    .related("account", (q) => q.related("plaidConnection", (c) => c.related("institution")))
    .orderBy("date", "desc")
    .limit(30);

const buildPrefetchQuery = () =>
  zql.transaction
    .related("account", (q) => q.related("plaidConnection", (c) => c.related("institution")))
    .orderBy("date", "desc")
    .limit(300);

const buildSearchQuery = (trimmedSearch: string) => {
  const pattern = ILIKE_WILDCARD(trimmedSearch);
  return zql.transaction
    .where(({ cmp, or }) =>
      or(cmp("name", "ILIKE", pattern), cmp("merchantName", "ILIKE", pattern)),
    )
    .related("account", (q) => q.related("plaidConnection", (c) => c.related("institution")))
    .orderBy("date", "desc")
    .limit(50);
};

const toListItem = (row: unknown): TransactionListItem | null =>
  mapZeroTransactionListRow(row as ZeroTransactionListRow);

const isNotNull = <T,>(value: T | null): value is T => value !== null;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTransactionSearch(trimmedSearch: string, enabled: boolean) {
  const zero = useZero();

  const [transactionRows] = useQuery(
    trimmedSearch.length > 0 ? buildSearchQuery(trimmedSearch) : buildRecentQuery(),
    { enabled },
  );

  const filteredTransactions = useMemo<TransactionListItem[]>(
    () => (enabled ? transactionRows.map(toListItem).filter(isNotNull) : []),
    [enabled, transactionRows],
  );

  const prefetch = useCallback(() => {
    zero.run(buildPrefetchQuery());
  }, [zero]);

  return { filteredTransactions, prefetch };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionSearchResults({
  filteredTransactions,
  trimmedSearch,
  onSelect,
}: {
  filteredTransactions: TransactionListItem[];
  trimmedSearch: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {filteredTransactions.length === 0 ? (
        <CommandEmpty>
          {trimmedSearch.length > 0 ? "No transactions found." : "No recent transactions."}
        </CommandEmpty>
      ) : null}
      <CommandGroup heading={trimmedSearch.length > 0 ? "Search results" : "Recent"}>
        {filteredTransactions.map((t) => {
          const name = getTransactionDisplayName(t) || "Untitled";
          const isInflow = (t.amount ?? 0) < 0;
          return (
            <CommandItem
              key={t.id}
              onSelect={() => onSelect(t.id)}
              onMouseDown={(e: MouseEvent) => {
                if (isCleanLeftClick(e)) {
                  e.preventDefault();
                  onSelect(t.id);
                }
              }}
              value={`${t.id} ${name} ${t.accountName ?? ""}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <MerchantLogo
                  className="size-8 shrink-0"
                  counterparties={t.counterparties}
                  logoUrl={t.logoUrl}
                  merchantName={t.merchantName}
                  website={t.website}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {[t.accountName, formatDate(t.date)].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span
                  className={cn(
                    "ml-auto shrink-0 font-medium tabular-nums",
                    isInflow ? "text-success" : "text-destructive",
                  )}
                >
                  <PrivateAmount>
                    {isInflow ? "+" : "-"}
                    {formatAmount(t.amount)}
                  </PrivateAmount>
                </span>
              </div>
            </CommandItem>
          );
        })}
      </CommandGroup>
    </>
  );
}

export function TransactionSearchFooter() {
  return (
    <div className="flex items-center gap-4 border-border/50 border-t px-4 py-2 text-muted-foreground text-xs">
      <div className="flex items-center gap-2">
        <KbdGroup>
          <Kbd>↵</Kbd>
        </KbdGroup>
        <span>Open</span>
      </div>
    </div>
  );
}
