import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { Checkbox } from "@cobalt-web/ui/components/checkbox";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  ArrowRight01Icon,
  Calendar03Icon,
  Delete02Icon,
  EyeIcon,
  Folder01Icon,
  Location01Icon,
  PencilEdit01Icon,
  Store01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
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
import type { CSSProperties, KeyboardEvent, MouseEvent, ReactElement } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@cobalt-web/ui/components/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@cobalt-web/ui/components/alert-dialog";
import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Skeleton } from "@cobalt-web/ui/components/skeleton";
import type { GeocodeSearchState, MerchantSearchState } from "./add-transaction-dialog";
import { CategoryPickerList } from "./detail/category-picker";
import type { CategoryPickerOption } from "./detail/editable-category";
import { LocationPickerList } from "./detail/editable-location";
import { MerchantPickerList } from "./detail/editable-merchant-logo";
import { TagPickerList } from "./tags/tag-picker";
import type { TagOption } from "./tags/tag-picker";
import { PrivateAmount } from "../../components/privacy";
import { ConnectAccountEmpty } from "../empty/connect-account-empty";
import { NoFilterResultsEmpty } from "../empty/no-filter-results-empty";
import { AccountLogo } from "../accounts/account-logo";
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
      const {
        accountLogoDomain,
        accountName,
        accountSubtype,
        institutionLogo,
        institutionName,
        institutionUrl,
        source,
      } = row.original;
      const effectiveUrl = source === "manual" ? accountLogoDomain : institutionUrl;
      const effectiveName = institutionName?.trim() ? institutionName : accountName;

      return (
        <div className={cellRow} title={effectiveName}>
          <AccountLogo
            institutionLogo={institutionLogo}
            logoDomain={effectiveUrl}
            name={effectiveName}
            source={source}
            subtype={accountSubtype}
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
              {/* Compact (below lg): just category name — group + chevron hidden. */}
              <span className="min-w-0 truncate text-foreground lg:hidden">{cat.name}</span>
              {/* Full (lg+): group › category. */}
              <span className="hidden shrink-0 text-foreground lg:inline">
                {groupLabel ?? cat.name}
              </span>
              {groupLabel ? (
                <span className="hidden min-w-0 items-center gap-1.5 lg:inline-flex">
                  <HugeiconsIcon
                    aria-hidden
                    className="size-3 shrink-0 text-muted-foreground"
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                  />
                  <span className="min-w-0 truncate text-muted-foreground">{cat.name}</span>
                </span>
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
      const amountColor = amount >= 0 ? "text-destructive" : "text-success";
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

type TransactionLocation = NonNullable<TransactionListItem["location"]>;

/** `yyyy-mm-dd[...]` → noon-UTC Date, matching the detail page's date picker. */
function isoToDateOnly(iso: string): Date {
  const day = String(iso).split("T")[0] ?? String(iso);
  return new Date(`${day}T12:00:00.000Z`);
}

/** Date → `yyyy-mm-dd` in UTC, matching the detail page's date picker. */
function dateToIso(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Single-date picker body for the row context menu — a single-month calendar,
 * mirroring the toolbar filter menu's `DatesSubContent` (which is a dual-month
 * range picker; a transaction has one date, so no range presets).
 */
function DateSubContent({
  dateIso,
  onSelect,
}: {
  dateIso: string;
  onSelect: (iso: string) => void;
}) {
  return (
    <div onKeyDown={(e) => e.stopPropagation()} role="presentation">
      <Calendar
        className="bg-transparent"
        mode="single"
        numberOfMonths={1}
        onSelect={(date) => {
          if (!date) {
            return;
          }
          const iso = dateToIso(date);
          if (iso !== dateIso) {
            onSelect(iso);
          }
        }}
        selected={isoToDateOnly(dateIso)}
      />
    </div>
  );
}

function NameSubContent({
  initial,
  onClose,
  onSubmit,
}: {
  initial: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <form
      className="p-2"
      onKeyDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        const next = value.trim();
        if (next.length > 0 && next !== initial) {
          onSubmit(next);
        }
        onClose();
      }}
    >
      {/* biome-ignore lint/a11y/noAutofocus: sub-menu input expects keyboard focus on open */}
      <input
        autoFocus
        className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        defaultValue={initial}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Transaction name"
        type="text"
      />
    </form>
  );
}

/**
 * Wraps a transaction row with a right-click menu exposing the same edits the
 * detail page and bulk-actions flow offer: category, tags, date.
 * Category/tag editing reuses the shared `CategoryPicker` / `TagPicker`
 * popovers so the pickers stay consistent everywhere. Renders children
 * unchanged when no mutation callbacks are supplied so the table stays usable
 * in read-only contexts (previews, tests).
 */
function TransactionRowContextMenu({
  transaction,
  categoryOptions,
  tagOptions,
  merchantSearch,
  locationSearch,
  onOpen,
  onSetCategory,
  onSetTags,
  onSetDate,
  onSetMerchant,
  onSetLocation,
  onSetName,
  onDeleteTransaction,
  children,
}: {
  transaction: TransactionListItem;
  categoryOptions?: readonly CategoryPickerOption[];
  tagOptions?: readonly TagOption[];
  merchantSearch?: MerchantSearchState;
  locationSearch?: GeocodeSearchState;
  onOpen: () => void;
  onSetCategory?: (transactionId: string, categoryId: string) => void;
  onSetTags?: (transactionId: string, tagIds: string[]) => void;
  onSetDate?: (transactionId: string, dateIso: string) => void;
  onSetMerchant?: (
    transactionId: string,
    merchant: { merchantName: string | null; website: string | null },
  ) => void;
  onSetLocation?: (transactionId: string, location: TransactionLocation) => void;
  onSetName?: (transactionId: string, name: string) => void;
  onDeleteTransaction?: (transactionId: string) => void;
  children: ReactElement;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuActionsRef = useRef<{ close: () => void; unmount: () => void } | null>(null);
  const hasCategory = Boolean(onSetCategory && categoryOptions && categoryOptions.length > 0);
  const hasTags = Boolean(onSetTags && tagOptions && tagOptions.length > 0);
  const hasDate = Boolean(onSetDate);
  const hasMerchant = Boolean(onSetMerchant && merchantSearch);
  const hasLocation = Boolean(onSetLocation && locationSearch);
  const hasName = Boolean(onSetName);
  const hasDelete = Boolean(onDeleteTransaction) && transaction.source === "manual";

  const hasAnyAction =
    hasCategory || hasTags || hasDate || hasMerchant || hasLocation || hasName || hasDelete;
  if (!hasAnyAction) {
    return children;
  }

  const closeMenu = () => menuActionsRef.current?.close();

  return (
    <>
      <ContextMenu actionsRef={menuActionsRef}>
        <ContextMenuTrigger render={children} />
        <TransactionContextMenuContent
          categoryOptions={categoryOptions}
          closeMenu={closeMenu}
          flags={{ hasCategory, hasDate, hasDelete, hasLocation, hasMerchant, hasName, hasTags }}
          locationSearch={locationSearch}
          merchantSearch={merchantSearch}
          onOpen={onOpen}
          onRequestDelete={() => setConfirmDelete(true)}
          onSetCategory={onSetCategory}
          onSetDate={onSetDate}
          onSetLocation={onSetLocation}
          onSetMerchant={onSetMerchant}
          onSetName={onSetName}
          onSetTags={onSetTags}
          tagOptions={tagOptions}
          transaction={transaction}
        />
      </ContextMenu>
      {hasDelete ? (
        <DeleteTransactionDialog
          onConfirm={() => onDeleteTransaction?.(transaction.id)}
          onOpenChange={setConfirmDelete}
          open={confirmDelete}
        />
      ) : null}
    </>
  );
}

interface ContextMenuFlags {
  hasCategory: boolean;
  hasTags: boolean;
  hasDate: boolean;
  hasMerchant: boolean;
  hasLocation: boolean;
  hasName: boolean;
  hasDelete: boolean;
}

function TransactionContextMenuContent({
  transaction,
  categoryOptions,
  tagOptions,
  merchantSearch,
  locationSearch,
  flags,
  closeMenu,
  onOpen,
  onRequestDelete,
  onSetCategory,
  onSetTags,
  onSetDate,
  onSetMerchant,
  onSetLocation,
  onSetName,
}: {
  transaction: TransactionListItem;
  categoryOptions?: readonly CategoryPickerOption[];
  tagOptions?: readonly TagOption[];
  merchantSearch?: MerchantSearchState;
  locationSearch?: GeocodeSearchState;
  flags: ContextMenuFlags;
  closeMenu: () => void;
  onOpen: () => void;
  onRequestDelete: () => void;
  onSetCategory?: (transactionId: string, categoryId: string) => void;
  onSetTags?: (transactionId: string, tagIds: string[]) => void;
  onSetDate?: (transactionId: string, dateIso: string) => void;
  onSetMerchant?: (
    transactionId: string,
    merchant: { merchantName: string | null; website: string | null },
  ) => void;
  onSetLocation?: (transactionId: string, location: TransactionLocation) => void;
  onSetName?: (transactionId: string, name: string) => void;
}) {
  const currentTagIds = transaction.tagIds ?? [];
  const currentCategoryId = transaction.category?.id ?? null;
  const showEditSeparator =
    flags.hasCategory ||
    flags.hasTags ||
    flags.hasDate ||
    flags.hasMerchant ||
    flags.hasLocation ||
    flags.hasName;

  return (
    <ContextMenuContent className="w-56">
      <ContextMenuItem className="rounded-lg" onClick={onOpen}>
        <HugeiconsIcon className="size-4 text-muted-foreground" icon={EyeIcon} />
        View details
      </ContextMenuItem>
      {showEditSeparator ? <ContextMenuSeparator /> : null}
      {flags.hasCategory ? (
        <CategorySubMenu
          categoryOptions={categoryOptions}
          closeMenu={closeMenu}
          currentCategoryId={currentCategoryId}
          onSetCategory={onSetCategory}
          transactionId={transaction.id}
        />
      ) : null}
      {flags.hasTags ? (
        <TagsSubMenu
          currentTagIds={currentTagIds}
          onSetTags={onSetTags}
          tagOptions={tagOptions}
          transactionId={transaction.id}
        />
      ) : null}
      {flags.hasDate ? (
        <DateSubMenu
          closeMenu={closeMenu}
          dateIso={transaction.date}
          onSetDate={onSetDate}
          transactionId={transaction.id}
        />
      ) : null}
      {flags.hasMerchant && merchantSearch ? (
        <MerchantSubMenu
          closeMenu={closeMenu}
          merchantName={transaction.merchantName}
          merchantSearch={merchantSearch}
          onSetMerchant={onSetMerchant}
          transactionId={transaction.id}
        />
      ) : null}
      {flags.hasLocation && locationSearch ? (
        <LocationSubMenu
          closeMenu={closeMenu}
          locationSearch={locationSearch}
          onSetLocation={onSetLocation}
          transactionId={transaction.id}
        />
      ) : null}
      {flags.hasName ? (
        <NameSubMenu
          closeMenu={closeMenu}
          initial={transaction.name ?? ""}
          onSetName={onSetName}
          transactionId={transaction.id}
        />
      ) : null}
      {flags.hasDelete ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem className="rounded-lg" onClick={onRequestDelete} variant="destructive">
            <HugeiconsIcon className="size-4" icon={Delete02Icon} />
            Delete transaction
          </ContextMenuItem>
        </>
      ) : null}
    </ContextMenuContent>
  );
}

function CategorySubMenu({
  categoryOptions,
  closeMenu,
  currentCategoryId,
  onSetCategory,
  transactionId,
}: {
  categoryOptions?: readonly CategoryPickerOption[];
  closeMenu: () => void;
  currentCategoryId: string | null;
  onSetCategory?: (transactionId: string, categoryId: string) => void;
  transactionId: string;
}) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="rounded-lg">
        <HugeiconsIcon className="size-4 text-muted-foreground" icon={Folder01Icon} />
        Set category
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-auto shadow-lg">
        <CategoryPickerList
          autoFocusSearch={false}
          onSelect={(option) => {
            onSetCategory?.(transactionId, option.id);
            closeMenu();
          }}
          options={categoryOptions ?? []}
          selectedKey={currentCategoryId}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

function TagsSubMenu({
  currentTagIds,
  onSetTags,
  tagOptions,
  transactionId,
}: {
  currentTagIds: readonly string[];
  onSetTags?: (transactionId: string, tagIds: string[]) => void;
  tagOptions?: readonly TagOption[];
  transactionId: string;
}) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="rounded-lg">
        <HugeiconsIcon className="size-4 text-muted-foreground" icon={Tag01Icon} />
        Tags
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-auto shadow-lg">
        <TagPickerList
          autoFocusSearch={false}
          onChange={(ids) => onSetTags?.(transactionId, ids)}
          options={[...(tagOptions ?? [])]}
          selectedIds={[...currentTagIds]}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

function DateSubMenu({
  closeMenu,
  dateIso,
  onSetDate,
  transactionId,
}: {
  closeMenu: () => void;
  dateIso: string;
  onSetDate?: (transactionId: string, dateIso: string) => void;
  transactionId: string;
}) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="rounded-lg">
        <HugeiconsIcon className="size-4 text-muted-foreground" icon={Calendar03Icon} />
        Set date
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-auto p-0 shadow-lg">
        <DateSubContent
          dateIso={dateIso}
          onSelect={(iso) => {
            onSetDate?.(transactionId, iso);
            closeMenu();
          }}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

function MerchantSubMenu({
  closeMenu,
  merchantName,
  merchantSearch,
  onSetMerchant,
  transactionId,
}: {
  closeMenu: () => void;
  merchantName: string | null;
  merchantSearch: MerchantSearchState;
  onSetMerchant?: (
    transactionId: string,
    merchant: { merchantName: string | null; website: string | null },
  ) => void;
  transactionId: string;
}) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="rounded-lg">
        <HugeiconsIcon className="size-4 text-muted-foreground" icon={Store01Icon} />
        Change merchant
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-80 shadow-lg">
        <MerchantPickerList
          autoFocusSearch={false}
          hasMerchant={Boolean(merchantName)}
          merchantSearch={merchantSearch}
          onAfterSubmit={() => closeMenu()}
          onSubmit={(merchant) => onSetMerchant?.(transactionId, merchant)}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

function LocationSubMenu({
  closeMenu,
  locationSearch,
  onSetLocation,
  transactionId,
}: {
  closeMenu: () => void;
  locationSearch: GeocodeSearchState;
  onSetLocation?: (transactionId: string, location: TransactionLocation) => void;
  transactionId: string;
}) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="rounded-lg">
        <HugeiconsIcon className="size-4 text-muted-foreground" icon={Location01Icon} />
        Change location
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-72 shadow-lg">
        <LocationPickerList
          autoFocusSearch={false}
          locationSearch={locationSearch}
          onAfterSubmit={() => closeMenu()}
          onSubmit={(location) => onSetLocation?.(transactionId, location)}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

function NameSubMenu({
  closeMenu,
  initial,
  onSetName,
  transactionId,
}: {
  closeMenu: () => void;
  initial: string;
  onSetName?: (transactionId: string, name: string) => void;
  transactionId: string;
}) {
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="rounded-lg">
        <HugeiconsIcon className="size-4 text-muted-foreground" icon={PencilEdit01Icon} />
        Change name
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="w-72 p-0 shadow-lg">
        <NameSubContent
          initial={initial}
          onClose={() => closeMenu()}
          onSubmit={(name) => onSetName?.(transactionId, name)}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
}

function DeleteTransactionDialog({
  onConfirm,
  onOpenChange,
  open,
}: {
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the transaction. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TransactionsTable({
  categoryOptions,
  hasActiveFilters = false,
  isComplete,
  items,
  locationSearch,
  merchantSearch,
  onClearFilters,
  onConnectAccount,
  onDeleteTransaction,
  onEndReached,
  onOpenTransaction,
  onSetCategory,
  onSetDate,
  onSetLocation,
  onSetMerchant,
  onSetName,
  onSetTags,
  rowSelection: rowSelectionProp,
  onRowSelectionChange,
  tagOptions,
  tagsById,
}: {
  categoryOptions?: readonly CategoryPickerOption[];
  hasActiveFilters?: boolean;
  isComplete: boolean;
  items: TransactionListItem[];
  /** Right-click menu: geocode search state powering "Change location". */
  locationSearch?: GeocodeSearchState;
  /** Right-click menu: merchant search state powering "Change merchant". */
  merchantSearch?: MerchantSearchState;
  onClearFilters?: () => void;
  onConnectAccount?: () => void;
  /** Right-click menu: permanently delete a manual transaction. Omit to hide. */
  onDeleteTransaction?: (transactionId: string) => void;
  /** Called when the virtualized list's last row enters the render window. Use to load more rows. */
  onEndReached?: () => void;
  onOpenTransaction?: (transaction: TransactionListItem) => void;
  /** Right-click menu: set a transaction's category. Omit to hide the item. */
  onSetCategory?: (transactionId: string, categoryId: string) => void;
  /** Right-click menu: set a transaction's date (`yyyy-mm-dd`). Omit to hide. */
  onSetDate?: (transactionId: string, dateIso: string) => void;
  /** Right-click menu: set a transaction's location. Omit to hide the item. */
  onSetLocation?: (transactionId: string, location: TransactionLocation) => void;
  /** Right-click menu: set a transaction's merchant. Omit to hide the item. */
  onSetMerchant?: (
    transactionId: string,
    merchant: { merchantName: string | null; website: string | null },
  ) => void;
  /** Right-click menu: rename a transaction. Omit to hide the item. */
  onSetName?: (transactionId: string, name: string) => void;
  /** Right-click menu: replace a transaction's tag set. Omit to hide the item. */
  onSetTags?: (transactionId: string, tagIds: string[]) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (next: RowSelectionState) => void;
  tagOptions?: readonly TagOption[];
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

  // Infinite scroll: fire onEndReached once per growth of `flatItems` when the last
  // virtualized row enters the render window. Stable ref avoids re-running on every
  // callback identity change; count-guard prevents duplicate fires while paging.
  const onEndReachedRef = useRef(onEndReached);
  onEndReachedRef.current = onEndReached;
  const lastFiredCountRef = useRef(0);
  useEffect(() => {
    if (flatItems.length <= lastFiredCountRef.current) {
      return;
    }
    const last = virtualItems.at(-1);
    if (!last) {
      return;
    }
    if (last.index >= flatItems.length - 5) {
      lastFiredCountRef.current = flatItems.length;
      onEndReachedRef.current?.();
    }
  }, [virtualItems, flatItems.length]);

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
                      className="group/month grid rounded-lg bg-sidebar font-medium text-foreground"
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
                  <TransactionRowContextMenu
                    categoryOptions={categoryOptions}
                    key={vi.key}
                    locationSearch={locationSearch}
                    merchantSearch={merchantSearch}
                    onDeleteTransaction={onDeleteTransaction}
                    onOpen={() => openTransaction(row)}
                    onSetCategory={onSetCategory}
                    onSetDate={onSetDate}
                    onSetLocation={onSetLocation}
                    onSetMerchant={onSetMerchant}
                    onSetName={onSetName}
                    onSetTags={onSetTags}
                    tagOptions={tagOptions}
                    transaction={row.original}
                  >
                    <div
                      aria-label={`View details for ${getTransactionDisplayName(row.original)}`}
                      className="group grid cursor-pointer font-normal"
                      data-index={vi.index}
                      data-state={row.getIsSelected() ? "selected" : undefined}
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
                  </TransactionRowContextMenu>
                );
              })
            : null}
        </div>
        {!hasRows && !isComplete ? (
          <div className="flex flex-col gap-1 p-3" role="row">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                className="grid items-center"
                key={i}
                role="cell"
                style={{
                  gridTemplateColumns: GRID_TEMPLATE_COLUMNS,
                  height: ROW_HEIGHT,
                }}
              >
                <div className="p-3" />
                <div className="p-3">
                  <Skeleton className="size-7 rounded-full" />
                </div>
                <div className="p-3">
                  <Skeleton className="size-7 rounded-full" />
                </div>
                <div className="p-3">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="p-3">
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="p-3">
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="p-3">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="flex justify-end p-3">
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!hasRows && isComplete ? (
          <div className="p-6" role="row">
            <div role="cell">
              {hasActiveFilters ? (
                <NoFilterResultsEmpty onClearFilters={onClearFilters} />
              ) : (
                <ConnectAccountEmpty
                  description="Connect a bank account to start seeing your transactions here."
                  onConnect={onConnectAccount}
                  title="No transactions yet"
                />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
