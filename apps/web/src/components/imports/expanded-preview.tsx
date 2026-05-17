import { Calendar } from "@cobalt-web/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@cobalt-web/ui/components/popover";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { InstitutionLogo } from "@cobalt-web/ui/cobalt/logos/institution-logo";
import { CobaltSelectPopover } from "@cobalt-web/ui/cobalt/select-popover";
import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import { CategoryPicker } from "@cobalt-web/ui/cobalt/transactions/detail/category-picker";
import { deriveCategorySection } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { CategoryPickerOption } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useAccounts } from "@/hooks/use-accounts";
import { importCategoryMap, importResolutions, importStagedRows } from "@/hooks/imports-queries";

import type { PersistableKey, StagedRow } from "./use-staged-row-overlay";
import { useStagedRowOverlay } from "./use-staged-row-overlay";

/** Keys whose value is an editable text field (everything except `tags`). */
type TextKey = Exclude<keyof StagedRow, "tags">;

/** Plain text-input columns. Date / Account / Category are special-cased to pickers. */
const TEXT_COLUMNS: { key: TextKey; label: string }[] = [
  { key: "merchant", label: "Merchant" },
  { key: "amount", label: "Amount" },
  { key: "originalDescription", label: "Original description" },
];
const TRAILING_COLUMNS: { key: TextKey; label: string }[] = [{ key: "notes", label: "Notes" }];

/** Column keys (matches `<colgroup>` order). `tags` only rendered when mapped. */
type ColumnKey =
  | "#"
  | "date"
  | "merchant"
  | "amount"
  | "originalDescription"
  | "account"
  | "category"
  | "notes"
  | "tags";

const DEFAULT_WIDTHS: Record<ColumnKey, number> = {
  "#": 40,
  account: 200,
  amount: 96,
  category: 200,
  date: 120,
  merchant: 180,
  notes: 200,
  originalDescription: 260,
  tags: 160,
};
const MIN_WIDTH = 60;

/** Sum of every column width except `originalDescription` (the flex column). */
function sumOthers(w: Record<ColumnKey, number>, includeTags: boolean): number {
  return (
    w["#"] +
    w.date +
    w.merchant +
    w.amount +
    w.account +
    w.category +
    w.notes +
    (includeTags ? w.tags : 0)
  );
}

/** ISO `yyyy-MM-dd` ↔ `Date` — picker output is normalized so format issues can't sneak in. */
function isoToDate(iso: string): Date | undefined {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Mini-spreadsheet view of every staged row. Edit/persist/merge state lives in
 * `useStagedRowOverlay`; this component is render + column-resize only.
 */
export function ExpandedPreview({ jobId }: { jobId: string }) {
  const rowsQuery = useQuery(importStagedRows(jobId));
  // Reuse the category-map endpoint purely for its category + group lists.
  const categoryQuery = useQuery(importCategoryMap(jobId));
  // The account + category decisions the user already confirmed in this import.
  // Includes pending creates (not real `financial_account` / `category` rows yet).
  const resolutionsQuery = useQuery(importResolutions(jobId));

  const overlay = useStagedRowOverlay({
    baseRows: rowsQuery.data?.rows ?? [],
    jobId,
    resolutions: resolutionsQuery.data,
  });

  const { items: existingAccounts } = useAccounts();
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(DEFAULT_WIDTHS);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tagsMapped = rowsQuery.data?.tagsMapped ?? false;

  // originalDescription is the "flex" column: it fills whatever space the
  // other columns don't take. Resizing any other column steals from / gives
  // back to it, so the table always equals container width.
  // Stretch originalDescription to fill on first mount (pre-paint).
  useLayoutEffect(() => {
    const containerW = tableContainerRef.current?.clientWidth ?? 0;
    if (containerW === 0) {
      return;
    }
    setColumnWidths((p) => ({
      ...p,
      originalDescription: Math.max(MIN_WIDTH, containerW - sumOthers(p, tagsMapped)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep filling on container resize (window resize, sheet open).
  useEffect(() => {
    const el = tableContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() => {
      const containerW = el.clientWidth;
      if (containerW === 0) {
        return;
      }
      setColumnWidths((p) => ({
        ...p,
        originalDescription: Math.max(MIN_WIDTH, containerW - sumOthers(p, tagsMapped)),
      }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [tagsMapped]);

  const startResize = (key: ColumnKey, startX: number, startWidth: number) => {
    const containerW = tableContainerRef.current?.clientWidth ?? 0;
    const onMove = (e: MouseEvent) => {
      setColumnWidths((p) => {
        const requested = startWidth + (e.clientX - startX);
        if (key === "originalDescription" || containerW === 0) {
          // originalDescription can shrink to MIN but can't grow past remaining viewport.
          if (key === "originalDescription" && containerW > 0) {
            const maxFlex = Math.max(
              MIN_WIDTH,
              containerW - sumOthers(p, tagsMapped) + p.originalDescription,
            );
            const clamped = Math.min(maxFlex, Math.max(MIN_WIDTH, requested));
            return { ...p, [key]: clamped };
          }
          return { ...p, [key]: Math.max(MIN_WIDTH, requested) };
        }
        // Non-flex col: cap so originalDescription stays >= MIN_WIDTH.
        const otherButThis = sumOthers(p, tagsMapped) - p[key];
        const maxThis = Math.max(MIN_WIDTH, containerW - otherButThis - MIN_WIDTH);
        const next = Math.min(maxThis, Math.max(MIN_WIDTH, requested));
        const updated = { ...p, [key]: next };
        const flex = Math.max(MIN_WIDTH, containerW - sumOthers(updated, tagsMapped));
        return { ...updated, originalDescription: flex };
      });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  if (rowsQuery.isPending || categoryQuery.isPending || resolutionsQuery.isPending) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (rowsQuery.isError) {
    return <p className="text-destructive text-sm">{(rowsQuery.error as Error).message}</p>;
  }

  // Real accounts + this import's pending creates, in one selectable list.
  const accountItems = [
    ...existingAccounts.map((a) => ({
      description: a.description,
      id: a.id,
      institution: a.institution,
      institutionLogo: a.institutionLogo,
      institutionUrl: a.institutionUrl,
    })),
    ...(resolutionsQuery.data?.pendingAccounts ?? []).map((p) => ({
      description: p.name,
      id: `pending:${p.key}`,
      institution: p.institutionName ?? "New account",
      institutionLogo: null,
      institutionUrl: p.institutionLogoDomain,
    })),
  ];

  const categoryData = categoryQuery.data;
  const groupById = new Map((categoryData?.userGroups ?? []).map((g) => [g.id, g] as const));
  const toCategoryOption = (c: {
    groupId: string;
    iconKey: string;
    id: string;
    name: string;
  }): CategoryPickerOption => {
    const group = groupById.get(c.groupId);
    const groupSystemKey = group?.systemKey ?? null;
    return {
      groupName: group?.name ?? "Other",
      groupSystemKey,
      iconKey: c.iconKey,
      id: c.id,
      name: c.name,
      sectionKey: deriveCategorySection(groupSystemKey),
    };
  };
  const categoryOptions: CategoryPickerOption[] = [
    ...(categoryData?.userCategories ?? []).map(toCategoryOption),
    // This import's pending category creates — id `pending:<sourceLabel>`.
    ...(resolutionsQuery.data?.pendingCategories ?? []).map((pc) =>
      toCategoryOption({
        groupId: pc.groupId,
        iconKey: pc.iconKey,
        id: `pending:${pc.sourceLabel}`,
        name: pc.name,
      }),
    ),
  ];

  const renderResizableTh = (key: ColumnKey, label: string, extraClass?: string) => (
    <th
      className={cn("relative border-r border-b px-2 py-1.5 text-left font-medium", extraClass)}
      key={key}
    >
      {label}
      <div
        aria-label={`Resize ${label} column`}
        aria-orientation="vertical"
        className="-right-px absolute top-0 z-20 h-full w-1.5 cursor-col-resize select-none hover:bg-foreground/20"
        onMouseDown={(e) => {
          e.preventDefault();
          startResize(key, e.clientX, columnWidths[key]);
        }}
        role="separator"
      />
    </th>
  );

  return (
    <div className="min-h-0 w-full flex-1 overflow-auto border-t" ref={tableContainerRef}>
      <table className="w-full border-collapse text-sm" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: columnWidths["#"] }} />
          <col style={{ width: columnWidths.date }} />
          {TEXT_COLUMNS.map((c) => (
            <col key={c.key} style={{ width: columnWidths[c.key as ColumnKey] }} />
          ))}
          <col style={{ width: columnWidths.account }} />
          <col style={{ width: columnWidths.category }} />
          {TRAILING_COLUMNS.map((c) => (
            <col key={c.key} style={{ width: columnWidths[c.key as ColumnKey] }} />
          ))}
          {tagsMapped && <col style={{ width: columnWidths.tags }} />}
        </colgroup>
        <thead className="sticky top-0 z-30 bg-muted text-muted-foreground text-xs">
          <tr>
            {renderResizableTh("#", "#", "text-center")}
            {renderResizableTh("date", "Date")}
            {TEXT_COLUMNS.map((c) => renderResizableTh(c.key as ColumnKey, c.label))}
            {renderResizableTh("account", "Account")}
            {renderResizableTh("category", "Category")}
            {TRAILING_COLUMNS.map((c) => renderResizableTh(c.key as ColumnKey, c.label))}
            {tagsMapped && renderResizableTh("tags", "Tags")}
          </tr>
        </thead>
        <tbody>
          {overlay.rows.map((row, rowIdx) => {
            const dateBind = overlay.bindDate(row.id);
            const accountBind = overlay.bindAccount(row.id);
            const categoryBind = overlay.bindCategory(row.id);
            const picked = categoryBind.selectedId
              ? categoryOptions.find((o) => o.id === categoryBind.selectedId)
              : undefined;
            const pickedAccount = accountBind.selectedId
              ? accountItems.find((a) => a.id === accountBind.selectedId)
              : undefined;
            return (
              <tr className={cn(row.parseError && "bg-destructive/5")} key={row.id}>
                <td className="border-r border-b px-1 py-1 text-center align-middle text-muted-foreground text-xs tabular-nums">
                  {rowIdx + 1}
                </td>
                <td className="overflow-hidden border-r border-b p-0">
                  <Popover>
                    <PopoverTrigger
                      render={
                        <button
                          className="w-full px-2 py-1 text-left tabular-nums outline-none hover:bg-input/40"
                          type="button"
                        >
                          {dateBind.value || (
                            <span className="text-muted-foreground">Pick date…</span>
                          )}
                        </button>
                      }
                    />
                    <PopoverContent align="start" className="w-auto p-2">
                      <Calendar
                        captionLayout="dropdown"
                        endMonth={new Date()}
                        mode="single"
                        onSelect={(d) => {
                          if (d) {
                            dateBind.onSelect(dateToIso(d));
                          }
                        }}
                        selected={isoToDate(dateBind.value)}
                        startMonth={new Date(2000, 0)}
                      />
                    </PopoverContent>
                  </Popover>
                </td>
                {TEXT_COLUMNS.map((c) => {
                  const bind = overlay.bindCell(row.id, c.key as PersistableKey);
                  return (
                    <td className="overflow-hidden border-r border-b p-0" key={c.key}>
                      <input
                        className="block w-full min-w-0 bg-transparent px-2 py-1 outline-none focus:bg-input/40"
                        inputMode={c.key === "amount" ? "decimal" : undefined}
                        onBlur={bind.onBlur}
                        onChange={(e) => bind.onChange(e.target.value)}
                        value={bind.value ?? ""}
                      />
                    </td>
                  );
                })}
                <td className="overflow-hidden border-r border-b p-0">
                  <CobaltSelectPopover
                    contentClassName="w-64"
                    emptyText="No accounts"
                    groupBy={(a) => a.institution}
                    itemKey={(a) => a.id}
                    itemMatch={(a, q) =>
                      a.description.toLowerCase().includes(q) ||
                      a.institution.toLowerCase().includes(q)
                    }
                    items={accountItems}
                    onSelect={(a) => accountBind.onSelect(a.id)}
                    renderIcon={(a) =>
                      a.institutionLogo || a.institutionUrl ? (
                        <InstitutionLogo
                          className="size-5 rounded-sm"
                          institutionLogo={a.institutionLogo}
                          institutionName={a.institution}
                          institutionUrl={a.institutionUrl}
                        />
                      ) : null
                    }
                    renderLabel={(a) => (
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{a.description}</span>
                        <span className="truncate text-muted-foreground text-xs">
                          {a.institution}
                        </span>
                      </span>
                    )}
                    searchPlaceholder="Search accounts…"
                    selectedKey={accountBind.selectedId}
                    trigger={
                      <button
                        className="flex w-full items-center gap-1.5 px-2 py-1 text-left outline-none hover:bg-input/40"
                        type="button"
                      >
                        {(() => {
                          if (pickedAccount) {
                            return (
                              <>
                                {pickedAccount.institutionLogo || pickedAccount.institutionUrl ? (
                                  <InstitutionLogo
                                    className="size-4 shrink-0 rounded-sm"
                                    institutionLogo={pickedAccount.institutionLogo}
                                    institutionName={pickedAccount.institution}
                                    institutionUrl={pickedAccount.institutionUrl}
                                  />
                                ) : null}
                                <span className="min-w-0 flex-1 truncate">
                                  {pickedAccount.description}
                                </span>
                              </>
                            );
                          }
                          if (row.sourceAccountName) {
                            return (
                              <span className="min-w-0 flex-1 truncate">
                                {row.sourceAccountName}
                              </span>
                            );
                          }
                          return <span className="text-muted-foreground">Pick account…</span>;
                        })()}
                      </button>
                    }
                  />
                </td>
                <td className="overflow-hidden border-r border-b p-0">
                  <CategoryPicker
                    onSelect={(opt) => categoryBind.onSelect(opt.id)}
                    options={categoryOptions}
                    selectedKey={categoryBind.selectedId}
                    trigger={
                      <button
                        className="flex w-full items-center gap-1.5 px-2 py-1 text-left outline-none hover:bg-input/40"
                        type="button"
                      >
                        {(() => {
                          if (picked) {
                            return (
                              <>
                                <CategoryIcon
                                  icon={
                                    resolveCategoryIcon(picked.iconKey) ?? UNKNOWN_CATEGORY_ICON
                                  }
                                  sizeClassName="size-4"
                                />
                                <span className="min-w-0 flex-1 truncate">{picked.name}</span>
                              </>
                            );
                          }
                          if (row.sourceCategoryName) {
                            return (
                              <span className="min-w-0 flex-1 truncate">
                                {row.sourceCategoryName}
                              </span>
                            );
                          }
                          return <span className="text-muted-foreground">Pick…</span>;
                        })()}
                      </button>
                    }
                  />
                </td>
                {TRAILING_COLUMNS.map((c) => {
                  const bind = overlay.bindCell(row.id, c.key as PersistableKey);
                  return (
                    <td className="overflow-hidden border-r border-b p-0" key={c.key}>
                      <input
                        className="block w-full min-w-0 bg-transparent px-2 py-1 outline-none focus:bg-input/40"
                        onBlur={bind.onBlur}
                        onChange={(e) => bind.onChange(e.target.value)}
                        value={bind.value ?? ""}
                      />
                    </td>
                  );
                })}
                {tagsMapped && (
                  <td className="border-r border-b px-2 py-1 align-middle">
                    {row.tags.join(", ")}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
