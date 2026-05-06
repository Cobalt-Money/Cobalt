import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Checkbox } from "@cobalt-web/ui/components/checkbox";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, Row, RowSelectionState } from "@tanstack/react-table";
import type { Range, Virtualizer } from "@tanstack/react-virtual";
import { defaultRangeExtractor, observeElementRect, useVirtualizer } from "@tanstack/react-virtual";
import type { CSSProperties, KeyboardEvent, MouseEvent } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

import { PrivateAmount } from "../../components/privacy";
import { ConnectAccountEmpty } from "../empty/connect-account-empty";
import { InstitutionLogo } from "../logos/institution-logo";
import { MerchantLogo } from "../logos/merchant-logo";
import { CategoryIcon, resolveCategoryIcon, UNKNOWN_CATEGORY_ICON } from "./categories";
import {
  formatMonthGroupLabel,
  formatTransactionDateDisplay,
  getTransactionDisplayName,
  transactionDateSortKey,
  transactionMonthGroupKey,
} from "./lib/helpers";
import type { TagColor } from "./tags/palette";
import { TagChip } from "./tags/tag-chip";

export type TransactionTagsById = ReadonlyMap<string, { name: string; color: TagColor }>;

interface TransactionsTableMeta {
  tagsById?: TransactionTagsById;
}

function isCleanLeftClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
}

const currency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  style: "currency",
});

const STATUS_PENDING_ICON = "/assets/vectors/pending.svg";
const STATUS_POSTED_ICON = "/assets/vectors/posted.svg";

/** Shared grid template so dividers and rows align on the same columns. */
const GRID_TEMPLATE_COLUMNS =
  "2.5rem 3rem 3.5rem 7rem minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1fr) 7rem";

/**
 * Fixed row height. Tabular content is uniform by design (truncated name,
 * single-line date/amount/status, fixed-size logos), so the virtualizer uses
 * this as the source of truth — no per-row measurement, no layout jitter.
 * Month dividers reuse the same height so a future zero-virtual migration
 * (SRI-254) is a drop-in replacement.
 */
const ROW_HEIGHT = 52;

/**
 * Wrap `observeElementRect` to treat a zero-sized scroll element as a
 * reasonable fallback (jsdom + SSR report 0×0). Without this, the virtualizer
 * renders no items at all until real layout happens.
 */
// biome-ignore lint/nursery/noReactPropAssignments: TanStack Virtual's observeElementRect API is callback-based; conforming to its signature.
function observeElementRectWithFallback<TScroll extends Element>(
  instance: Virtualizer<TScroll, Element>,
  // eslint-disable-next-line promise/prefer-await-to-callbacks
  cb: (rect: { height: number; width: number }) => void,
) {
  return observeElementRect(instance, (rect) => {
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    cb({
      height: rect.height > 0 ? rect.height : 1200,
      width: rect.width > 0 ? rect.width : 1000,
    });
  });
}

function truncateName(name: string, max = 40): string {
  if (name.length <= max) {
    return name;
  }
  return `${name.slice(0, max)}…`;
}

const cellRow = "flex items-center leading-5";

const columns: ColumnDef<TransactionListItem>[] = [
  {
    cell: ({ row }) => (
      <div
        className={cn(
          cellRow,
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          row.getIsSelected() && "opacity-100",
        )}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
        }}
        role="presentation"
      >
        <Checkbox
          aria-label={`Select transaction ${getTransactionDisplayName(row.original)}`}
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => {
            row.toggleSelected(checked === true);
          }}
        />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
    header: () => null,
    id: "select",
  },
  {
    accessorKey: "pending",
    cell: ({ row }) => {
      const { pending } = row.original;
      const label = pending ? "Pending" : "Posted";
      return (
        <div className={cn(cellRow, "whitespace-nowrap")}>
          <img
            alt={label}
            className="size-5 shrink-0 object-contain"
            decoding="async"
            height={20}
            src={pending ? STATUS_PENDING_ICON : STATUS_POSTED_ICON}
            width={20}
          />
        </div>
      );
    },
    header: "Status",
  },
  {
    accessorFn: (row) => row.institutionName ?? row.accountName ?? "",
    cell: ({ row }) => {
      const { accountName, institutionLogo, institutionName, institutionUrl, source } =
        row.original;

      return (
        <div className={cellRow} title={institutionName?.trim() || accountName}>
          <InstitutionLogo
            institutionLogo={institutionLogo}
            institutionName={institutionName}
            institutionUrl={institutionUrl}
            source={source}
          />
        </div>
      );
    },
    header: "Bank",
    id: "account",
  },
  {
    accessorFn: (row) => transactionDateSortKey(row),
    cell: ({ row }) => (
      <div className={cn(cellRow, "whitespace-nowrap")}>
        {formatTransactionDateDisplay(row.original)}
      </div>
    ),
    header: "Date",
    id: "date",
  },
  {
    accessorFn: (row) => getTransactionDisplayName(row),
    cell: ({ row }) => {
      const fullName = getTransactionDisplayName(row.original);
      const displayName = truncateName(fullName);
      const { counterparties, logoUrl, merchantName, website } = row.original;

      return (
        <div className="min-w-0 truncate" title={fullName}>
          <div className={cn(cellRow, "gap-2")}>
            <MerchantLogo
              counterparties={counterparties}
              logoUrl={logoUrl}
              merchantName={merchantName}
              website={website}
            />
            <span>{displayName || "—"}</span>
          </div>
        </div>
      );
    },
    header: "Name",
    id: "name",
  },
  {
    accessorFn: (row) => {
      const cat = row.category;
      if (!cat) {
        return "";
      }
      return cat.groupName ? `${cat.groupName} ${cat.name}` : cat.name;
    },
    cell: ({ row }) => {
      const cat = row.original.category;
      if (!cat) {
        return <div className={cellRow}>—</div>;
      }
      const icon = resolveCategoryIcon(cat.iconKey) ?? UNKNOWN_CATEGORY_ICON;
      const groupLabel = cat.groupName;
      const title = groupLabel ? `${groupLabel} › ${cat.name}` : cat.name;

      return (
        <div className="min-w-0" title={title}>
          <div className={cn(cellRow, "min-w-0 gap-2")}>
            <CategoryIcon icon={icon} />
            <div className={cn(cellRow, "min-w-0 gap-1.5 text-sm")}>
              <span className="shrink-0 text-foreground">{groupLabel ?? cat.name}</span>
              {groupLabel ? (
                <>
                  <HugeiconsIcon
                    aria-hidden
                    className="size-3 shrink-0 text-muted-foreground"
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                  />
                  <span className="min-w-0 truncate text-muted-foreground">{cat.name}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      );
    },
    header: "Category",
    id: "category",
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as TransactionsTableMeta | undefined;
      const tagsById = meta?.tagsById;
      const ids = row.original.tagIds ?? [];
      if (!tagsById || ids.length === 0) {
        return null;
      }
      const visible = ids.slice(0, 2);
      const overflow = ids.length - visible.length;
      return (
        <div className={cn(cellRow, "min-w-0 gap-1")}>
          {visible.map((id) => {
            const t = tagsById.get(id);
            if (!t) {
              return null;
            }
            return <TagChip color={t.color} key={id} name={t.name} size="sm" />;
          })}
          {overflow > 0 ? (
            <span className="shrink-0 text-muted-foreground text-xs">+{overflow}</span>
          ) : null}
        </div>
      );
    },
    header: "Tags",
    id: "tags",
  },
  {
    accessorKey: "amount",
    cell: ({ row }) => {
      const { amount } = row.original;
      const formattedAmount = currency.format(Math.abs(amount));
      const amountColor = amount >= 0 ? "text-red-600 dark:text-red-500" : "text-green-550";
      return (
        <div className={cn(cellRow, "whitespace-nowrap tabular-nums", amountColor)}>
          <PrivateAmount>{formattedAmount}</PrivateAmount>
        </div>
      );
    },
    header: "Amount",
  },
];

function isInteractiveCellTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return Boolean(
    target.closest(
      "button, a, input, [role='checkbox'], [data-slot='checkbox'], [data-slot='checkbox-indicator']",
    ),
  );
}

type FlatItem =
  | {
      kind: "divider";
      monthKey: string;
      label: string;
      count: number;
    }
  | {
      kind: "row";
      row: Row<TransactionListItem>;
    };

function flattenRowsByMonth(rows: Row<TransactionListItem>[]): FlatItem[] {
  const items: FlatItem[] = [];
  let currentMonthKey: string | null = null;
  let currentDividerIndex = -1;

  for (const row of rows) {
    const monthKey = transactionMonthGroupKey(row.original);
    if (monthKey !== currentMonthKey) {
      currentMonthKey = monthKey;
      currentDividerIndex = items.length;
      items.push({
        count: 0,
        kind: "divider",
        label: formatMonthGroupLabel(monthKey),
        monthKey,
      });
    }
    items.push({ kind: "row", row });
    const divider = items[currentDividerIndex];
    if (divider && divider.kind === "divider") {
      divider.count += 1;
    }
  }
  return items;
}

export function TransactionsTable({
  isComplete,
  items,
  onConnectAccount,
  onOpenTransaction,
  rowSelection: rowSelectionProp,
  onRowSelectionChange,
  tagsById,
}: {
  isComplete: boolean;
  items: TransactionListItem[];
  onConnectAccount?: () => void;
  onOpenTransaction?: (transaction: TransactionListItem) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (next: RowSelectionState) => void;
  tagsById?: TransactionTagsById;
}) {
  const navigate = useNavigate();
  const router = useRouter();
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const isControlled = rowSelectionProp !== undefined;
  const rowSelection = isControlled ? rowSelectionProp : internalRowSelection;
  const setRowSelection = useCallback(
    (updater: RowSelectionState | ((old: RowSelectionState) => RowSelectionState)) => {
      const next =
        typeof updater === "function"
          ? (updater as (old: RowSelectionState) => RowSelectionState)(rowSelection)
          : updater;
      if (isControlled) {
        onRowSelectionChange?.(next);
      } else {
        setInternalRowSelection(next);
        onRowSelectionChange?.(next);
      }
    },
    [isControlled, onRowSelectionChange, rowSelection],
  );

  const openTransaction = useCallback(
    (row: Row<TransactionListItem>) => {
      if (onOpenTransaction) {
        onOpenTransaction(row.original);
        return;
      }
      navigate({
        params: { transactionId: row.original.id },
        to: "/transactions/$transactionId",
      });
    },
    [navigate, onOpenTransaction],
  );

  const onRowMouseDown = useCallback(
    (row: Row<TransactionListItem>, e: MouseEvent) => {
      if (!isCleanLeftClick(e)) {
        return;
      }
      if (isInteractiveCellTarget(e.target)) {
        return;
      }
      e.preventDefault();
      if (!onOpenTransaction) {
        router.preloadRoute({
          params: { transactionId: row.original.id },
          to: "/transactions/$transactionId",
        });
      }
      openTransaction(row);
    },
    [router, openTransaction, onOpenTransaction],
  );

  const onRowActivate = useCallback(
    (row: Row<TransactionListItem>, e: MouseEvent | KeyboardEvent) => {
      if ("key" in e) {
        if (e.key !== "Enter" && e.key !== " ") {
          return;
        }
        e.preventDefault();
      } else if (isInteractiveCellTarget(e.target)) {
        return;
      }
      openTransaction(row);
    },
    [openTransaction],
  );

  const tableMeta = useMemo<TransactionsTableMeta>(() => ({ tagsById }), [tagsById]);

  const table = useReactTable({
    columns,
    data: items,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ desc: true, id: "date" }],
    },
    meta: tableMeta,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  const { rows } = table.getRowModel();
  const flatItems = useMemo(() => flattenRowsByMonth(rows), [rows]);

  const rowIdsByMonth = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const key = transactionMonthGroupKey(row.original);
      const list = map.get(key);
      if (list) {
        list.push(row.id);
      } else {
        map.set(key, [row.id]);
      }
    }
    return map;
  }, [rows]);

  const toggleMonthSelection = useCallback(
    (monthKey: string, checked: boolean) => {
      const ids = rowIdsByMonth.get(monthKey);
      if (!ids) {
        return;
      }
      setRowSelection((old) => {
        if (checked) {
          const next = { ...old };
          for (const id of ids) {
            next[id] = true;
          }
          return next;
        }
        const idSet = new Set(ids);
        const next: RowSelectionState = {};
        for (const key of Object.keys(old)) {
          if (!idSet.has(key)) {
            next[key] = old[key] as boolean;
          }
        }
        return next;
      });
    },
    [rowIdsByMonth, setRowSelection],
  );

  const getMonthSelectionState = useCallback(
    (monthKey: string): "none" | "some" | "all" => {
      const ids = rowIdsByMonth.get(monthKey);
      if (!ids || ids.length === 0) {
        return "none";
      }
      let selected = 0;
      for (const id of ids) {
        if (rowSelection[id]) {
          selected += 1;
        }
      }
      if (selected === 0) {
        return "none";
      }
      if (selected === ids.length) {
        return "all";
      }
      return "some";
    },
    [rowIdsByMonth, rowSelection],
  );

  const stickyIndexes = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < flatItems.length; i += 1) {
      if (flatItems[i]?.kind === "divider") {
        out.push(i);
      }
    }
    return out;
  }, [flatItems]);

  const activeStickyIndexRef = useRef(0);

  const listRef = useRef<HTMLDivElement>(null);
  const [scrollParent, setScrollParent] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) {
      return;
    }
    let ancestor: HTMLElement | null = el.parentElement;
    while (ancestor) {
      const style = window.getComputedStyle(ancestor);
      if (/(auto|scroll|overlay)/.test(style.overflowY)) {
        break;
      }
      ancestor = ancestor.parentElement;
    }
    const parent = ancestor ?? document.documentElement;
    setScrollParent(parent);

    const parentRect = parent.getBoundingClientRect();
    const listRect = el.getBoundingClientRect();
    setScrollMargin(listRect.top - parentRect.top + parent.scrollTop);
  }, [flatItems.length]);

  const rangeExtractor = useCallback(
    (range: Range) => {
      const active =
        [...stickyIndexes].toReversed().find((i) => range.startIndex >= i) ?? stickyIndexes[0];
      if (active !== undefined) {
        activeStickyIndexRef.current = active;
      }
      const next = new Set<number>(defaultRangeExtractor(range));
      if (active !== undefined) {
        next.add(active);
      }
      return [...next].toSorted((a, b) => a - b);
    },
    [stickyIndexes],
  );

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => {
      const it = flatItems[index];
      if (!it) {
        return index;
      }
      return it.kind === "divider" ? `divider-${it.monthKey}` : it.row.id;
    },
    getScrollElement: () => scrollParent,
    // Ensures a sane render window before the scroll parent has been measured
    // (SSR, initial mount, jsdom tests), so the first rows appear immediately.
    initialRect: { height: 1200, width: 1000 },
    observeElementRect: observeElementRectWithFallback,
    overscan: 8,
    rangeExtractor,
    scrollMargin,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const hasRows = flatItems.length > 0;

  return (
    <div className="relative w-full flex-1 overflow-x-auto no-scrollbar">
      <div className="w-full min-w-full text-sm" role="table">
        <div
          className="relative block w-full"
          ref={listRef}
          style={{ height: hasRows ? totalSize : undefined }}
        >
          {hasRows
            ? virtualItems.map((vi) => {
                const item = flatItems[vi.index];
                if (!item) {
                  return null;
                }
                const isActiveSticky = activeStickyIndexRef.current === vi.index;
                const stickyStyle: CSSProperties = isActiveSticky
                  ? { position: "sticky", top: 0, zIndex: 2 }
                  : {
                      left: 0,
                      position: "absolute",
                      right: 0,
                      top: 0,
                      transform: `translateY(${vi.start - scrollMargin}px)`,
                    };

                if (item.kind === "divider") {
                  const selectionState = getMonthSelectionState(item.monthKey);
                  const isChecked = selectionState === "all";
                  const isIndeterminate = selectionState === "some";
                  return (
                    <div
                      className="group/month grid rounded-lg bg-muted font-medium text-foreground"
                      data-index={vi.index}
                      key={vi.key}
                      role="row"
                      style={{
                        ...stickyStyle,
                        gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                        height: ROW_HEIGHT,
                        zIndex: 2,
                      }}
                    >
                      <div
                        className={cn(
                          "flex items-center p-3",
                          "opacity-0 group-hover/month:opacity-100 group-focus-within/month:opacity-100",
                          selectionState !== "none" && "opacity-100",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                        }}
                        role="presentation"
                      >
                        <Checkbox
                          aria-label={`Select all transactions in ${item.label}`}
                          checked={isChecked}
                          indeterminate={isIndeterminate}
                          onCheckedChange={(checked) => {
                            toggleMonthSelection(item.monthKey, checked === true);
                          }}
                        />
                      </div>
                      <div className="flex items-center p-3" role="cell">
                        <div className={cn(cellRow, "whitespace-nowrap")}>
                          <span className="font-normal tabular-nums text-muted-foreground text-sm">
                            {item.count}
                          </span>
                        </div>
                      </div>
                      <div className="p-3" role="presentation" />
                      <div className="flex items-center p-3" role="cell">
                        <div className={cn(cellRow, "whitespace-nowrap")}>
                          <span className="truncate font-medium text-foreground text-sm">
                            {item.label}
                          </span>
                        </div>
                      </div>
                      <div className="p-3" role="presentation" />
                      <div className="p-3" role="presentation" />
                      <div className="p-3" role="presentation" />
                    </div>
                  );
                }

                const { row } = item;
                const cells = row.getVisibleCells();
                return (
                  <div
                    aria-label={`View details for ${getTransactionDisplayName(row.original)}`}
                    className="group grid cursor-pointer font-normal"
                    data-index={vi.index}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    key={vi.key}
                    onKeyDown={(e) => {
                      onRowActivate(row, e);
                    }}
                    onMouseDown={(e) => {
                      onRowMouseDown(row, e);
                    }}
                    role="row"
                    style={{
                      ...stickyStyle,
                      gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                      height: ROW_HEIGHT,
                    }}
                    tabIndex={0}
                  >
                    {cells.map((cell, index) => (
                      <div
                        className={cn(
                          "flex min-w-0 items-center p-3",
                          "group-hover:bg-muted group-data-[state=selected]:bg-muted",
                          index === 0 &&
                            "group-hover:rounded-l-lg group-data-[state=selected]:rounded-l-lg",
                          index === cells.length - 1 &&
                            "group-hover:rounded-r-lg group-data-[state=selected]:rounded-r-lg",
                        )}
                        key={cell.id}
                        role="cell"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })
            : null}
        </div>
        {!hasRows && isComplete ? (
          <div className="p-6" role="row">
            <div role="cell">
              <ConnectAccountEmpty
                description="Connect a bank account to start seeing your transactions here."
                onConnect={onConnectAccount}
                title="No transactions yet"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
