import type { TransactionResponse } from "@cobalt-web/server-data/transactions/schemas";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import {
  CategoryIcon,
  resolveCategoryIcon,
  UNKNOWN_CATEGORY_ICON,
} from "@cobalt-web/ui/cobalt/transactions/categories";
import { deriveCategorySection } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { CategoryPickerOption } from "@cobalt-web/ui/cobalt/transactions/detail/editable-category";
import type { ExportFormat } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import { exportTransactions } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import { SelectionActionBar } from "@cobalt-web/ui/cobalt/transactions/selection-action-bar";
import type { TransactionTagsById } from "@cobalt-web/ui/cobalt/transactions/transactions-table";
import { TransactionsTable } from "@cobalt-web/ui/cobalt/transactions/transactions-table";
import { TransactionsToolbar } from "@cobalt-web/ui/cobalt/transactions/transactions-toolbar";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { isTagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCommandMenu } from "@/components/shell/command-menu";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { useTransactionUndo } from "@/lib/transaction-undo";
import { useAddTransactionData } from "@/hooks/use-add-transaction-data";
import { useBankOptions } from "@/hooks/use-bank-options";
import { useBulkSetCategory } from "@/hooks/use-bulk-transactions";
import { useMutator } from "@/hooks/use-mutator";
import { useSetTransactionTags, useTagOptions } from "@/hooks/use-tags";
import { transactionsListQuery, useTransactions } from "@/hooks/use-transactions";

import type { TransactionsSearch } from "./route";

export const Route = createFileRoute("/_auth/transactions/")({
  component: TransactionsListPage,
  loader: ({ context, deps }) => {
    context.zero.preload(queries.accounts.bankAccounts(), { ttl: "5m" });
    context.zero.preload(transactionsListQuery(deps), { ttl: "5m" });
    context.zero.preload(queries.tags.list(), { ttl: "5m" });
  },
  loaderDeps: ({ search }): TransactionsSearch => ({
    amount: search.amount,
    amountMax: search.amountMax,
    amountMin: search.amountMin,
    bank: search.bank,
    categoryIds: search.categoryIds,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    query: search.query,
    status: search.status,
    tagIds: search.tagIds,
  }),
  staticData: { title: "Transactions" },
});

function TransactionsListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const bankOptions = useBankOptions();
  const { options: tagOptions } = useTagOptions();
  const [allTags] = useQuery(queries.tags.list());
  const [allCategories] = useQuery(queries.categories.list({ includeHidden: true }));
  const categoryOptions = useMemo(
    () =>
      allCategories
        .filter((c) => !c.hidden)
        .map((c) => ({
          groupName: c.group?.name ?? null,
          groupSystemKey: c.group?.systemKey ?? null,
          iconKey: c.iconKey ?? null,
          id: c.id,
          name: c.name,
        })),
    [allCategories],
  );
  const categoryPickerOptions = useMemo<readonly CategoryPickerOption[]>(
    () =>
      allCategories
        .filter((c) => !c.hidden)
        .map((c) => {
          const groupSystemKey = c.group?.systemKey ?? null;
          return {
            groupName: c.group?.name ?? "",
            groupSystemKey,
            iconKey: c.iconKey,
            id: c.id,
            name: c.name,
            sectionKey: deriveCategorySection(groupSystemKey),
          };
        }),
    [allCategories],
  );
  const tagsById = useMemo<TransactionTagsById>(() => {
    const map = new Map<string, { name: string; color: TagColor }>();
    for (const t of allTags) {
      if (isTagColor(t.color)) {
        map.set(t.id, { color: t.color, name: t.name });
      }
    }
    return map;
  }, [allTags]);
  const { isComplete, items } = useTransactions({
    amount: search.amount,
    amountMax: search.amountMax,
    amountMin: search.amountMin,
    bank: search.bank,
    categoryIds: search.categoryIds,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    query: search.query,
    status: search.status,
    tagIds: search.tagIds,
  });
  const hasActiveFilters = Boolean(
    (search.amount && search.amount !== "all") ||
    typeof search.amountMin === "number" ||
    typeof search.amountMax === "number" ||
    (search.bank && search.bank.length > 0) ||
    (search.categoryIds && search.categoryIds.length > 0) ||
    (search.tagIds && search.tagIds.length > 0) ||
    (search.status && search.status !== "all") ||
    (search.query && search.query.length > 0) ||
    search.dateFrom ||
    search.dateTo,
  );
  const handleClearFilters = useCallback(() => {
    navigate({ replace: true, search: {}, to: "/transactions" });
  }, [navigate]);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectedCount = Object.keys(rowSelection).length;
  const { openAddAccount, openAddTransaction, openBulkActions, openManageTags } = useCommandMenu();
  const clearSelection = useCallback(() => setRowSelection({}), []);
  const handleOpenBulkActions = useCallback(() => {
    const selected = items.filter((item) => rowSelection[item.id]);
    if (selected.length === 0) {
      return;
    }
    openBulkActions(selected);
  }, [items, openBulkActions, rowSelection]);

  // ⌘K with active selection → bulk actions instead of default palette.
  // Capture phase intercepts before CommandMenuProvider's document listener.
  useEffect(() => {
    if (selectedCount === 0) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        const selected = items.filter((item) => rowSelection[item.id]);
        if (selected.length > 0) {
          openBulkActions(selected);
        }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [items, openBulkActions, rowSelection, selectedCount]);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (items.length === 0) {
        return;
      }
      exportTransactions(items, format);
    },
    [items],
  );

  const run = useMutator();
  const { locationSearch, merchantSearch } = useAddTransactionData();
  const { mutateAsync: bulkSetCategory } = useBulkSetCategory();
  const { mutate: setTransactionTags } = useSetTransactionTags();
  const { push: pushUndo } = useTransactionUndo();

  const txnById = useMemo(() => {
    const map = new Map<string, TransactionResponse>();
    for (const t of items) {
      map.set(t.id, t);
    }
    return map;
  }, [items]);

  const fieldLabel = useCallback(
    (field: string, tx: TransactionResponse | undefined) => (
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-foreground/60">Updated</span>
        <strong>{field}</strong>
        <span className="text-foreground/60">on {tx?.name ?? "transaction"}</span>
      </span>
    ),
    [],
  );

  const handleSetCategory = useCallback(
    (transactionId: string, categoryId: string) => {
      const tx = txnById.get(transactionId);
      const prior = tx?.category?.id ?? null;
      const nextCat = categoryOptions.find((c) => c.id === categoryId);
      const icon = nextCat?.iconKey
        ? (resolveCategoryIcon(nextCat.iconKey) ?? UNKNOWN_CATEGORY_ICON)
        : UNKNOWN_CATEGORY_ICON;
      const label = (
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-foreground/60">Set category to</span>
          <span className="inline-flex items-center gap-1">
            <CategoryIcon icon={icon} sizeClassName="size-4" />
            <strong>{nextCat?.name ?? "category"}</strong>
          </span>
          <span className="text-foreground/60">on {tx?.name ?? "transaction"}</span>
        </span>
      );
      pushUndo({
        forward: () => void bulkSetCategory({ categoryId, transactionIds: [transactionId] }),
        inverse: () => {
          if (prior) {
            void bulkSetCategory({ categoryId: prior, transactionIds: [transactionId] });
          } else {
            run(
              (m) =>
                m.transaction.resetCategory({ editId: crypto.randomUUID(), id: transactionId }),
              { silent: true },
            );
          }
        },
        label,
        skip: categoryId === prior,
      });
    },
    [bulkSetCategory, categoryOptions, pushUndo, run, txnById],
  );
  const handleSetTags = useCallback(
    (transactionId: string, tagIds: string[]) => {
      const tx = txnById.get(transactionId);
      const priorIds = [...(tx?.tagIds ?? [])].toSorted();
      const nextIds = [...new Set(tagIds)].toSorted();
      const same = priorIds.length === nextIds.length && priorIds.every((v, i) => v === nextIds[i]);
      pushUndo({
        forward: () => setTransactionTags({ tagIds: nextIds, transactionId }),
        inverse: () => setTransactionTags({ tagIds: priorIds, transactionId }),
        label: fieldLabel("tags", tx),
        skip: same,
      });
    },
    [fieldLabel, pushUndo, setTransactionTags, txnById],
  );
  const handleSetDate = useCallback(
    (transactionId: string, dateIso: string) => {
      const tx = txnById.get(transactionId);
      const prior = tx?.date ?? null;
      pushUndo({
        forward: () =>
          run(
            (m) =>
              m.transaction.updateDate({
                date: dateIso,
                editId: crypto.randomUUID(),
                id: transactionId,
              }),
            { silent: true },
          ),
        inverse: () => {
          if (prior) {
            run(
              (m) =>
                m.transaction.updateDate({
                  date: prior,
                  editId: crypto.randomUUID(),
                  id: transactionId,
                }),
              { silent: true },
            );
          } else {
            run(
              (m) => m.transaction.resetDate({ editId: crypto.randomUUID(), id: transactionId }),
              { silent: true },
            );
          }
        },
        label: fieldLabel("date", tx),
        skip: dateIso === prior,
      });
    },
    [fieldLabel, pushUndo, run, txnById],
  );
  const handleSetName = useCallback(
    (transactionId: string, name: string) => {
      const tx = txnById.get(transactionId);
      const prior = tx?.name ?? "";
      pushUndo({
        forward: () =>
          run(
            (m) =>
              m.transaction.updateName({
                editId: crypto.randomUUID(),
                id: transactionId,
                name,
              }),
            { silent: true },
          ),
        inverse: () =>
          run(
            (m) =>
              m.transaction.updateName({
                editId: crypto.randomUUID(),
                id: transactionId,
                name: prior,
              }),
            { silent: true },
          ),
        label: fieldLabel("name", tx),
        skip: name === prior,
      });
    },
    [fieldLabel, pushUndo, run, txnById],
  );
  const handleSetMerchant = useCallback(
    (transactionId: string, merchant: { merchantName: string | null; website: string | null }) => {
      const tx = txnById.get(transactionId);
      const priorMerchant = tx?.merchantName ?? null;
      const priorWebsite = tx?.website ?? null;
      pushUndo({
        forward: () =>
          run(
            (m) =>
              m.transaction.updateMerchant({
                editId: crypto.randomUUID(),
                id: transactionId,
                merchantName: merchant.merchantName,
                website: merchant.website,
              }),
            { silent: true },
          ),
        inverse: () =>
          run(
            (m) =>
              m.transaction.updateMerchant({
                editId: crypto.randomUUID(),
                id: transactionId,
                merchantName: priorMerchant,
                website: priorWebsite,
              }),
            { silent: true },
          ),
        label: fieldLabel("merchant", tx),
        skip: merchant.merchantName === priorMerchant && merchant.website === priorWebsite,
      });
    },
    [fieldLabel, pushUndo, run, txnById],
  );
  const handleSetLocation = useCallback(
    (transactionId: string, location: NonNullable<TransactionResponse["location"]>) => {
      const tx = txnById.get(transactionId);
      const prior = tx?.location ?? null;
      pushUndo({
        forward: () =>
          run(
            (m) =>
              m.transaction.updateLocation({
                editId: crypto.randomUUID(),
                id: transactionId,
                location,
              }),
            { silent: true },
          ),
        inverse: () => {
          if (prior) {
            run(
              (m) =>
                m.transaction.updateLocation({
                  editId: crypto.randomUUID(),
                  id: transactionId,
                  location: prior,
                }),
              { silent: true },
            );
          } else {
            run(
              (m) =>
                m.transaction.resetLocation({ editId: crypto.randomUUID(), id: transactionId }),
              { silent: true },
            );
          }
        },
        label: fieldLabel("location", tx),
      });
    },
    [fieldLabel, pushUndo, run, txnById],
  );
  const handleDeleteTransaction = useCallback(
    (transactionId: string) => {
      run(
        (m) => m.transaction.deleteTransaction({ id: transactionId }),
        "Couldn't delete transaction. Please try again.",
      );
      cobaltToast.transactionDeleted();
    },
    [run],
  );

  return (
    <SidebarShellLayout
      flushBottom
      toolbar={
        <TransactionsToolbar
          bankOptions={bankOptions}
          categoryOptions={categoryOptions}
          filters={search}
          items={items}
          onAddTransaction={openAddTransaction}
          onExport={handleExport}
          onManageCategories={() => navigate({ to: "/transactions/categories" })}
          onManageTags={openManageTags}
          tagOptions={tagOptions}
          onFiltersChange={(next) => {
            navigate({
              replace: true,
              search: {
                amount: next.amount && next.amount !== "all" ? next.amount : undefined,
                amountMax: typeof next.amountMax === "number" ? next.amountMax : undefined,
                amountMin:
                  typeof next.amountMin === "number" && next.amountMin > 0
                    ? next.amountMin
                    : undefined,
                bank: next.bank && next.bank.length > 0 ? [...next.bank] : undefined,
                categoryIds:
                  next.categoryIds && next.categoryIds.length > 0
                    ? [...next.categoryIds]
                    : undefined,
                dateFrom: next.dateFrom || undefined,
                dateTo: next.dateTo || undefined,
                query: next.query && next.query.length > 0 ? next.query : undefined,
                status: next.status && next.status !== "all" ? next.status : undefined,
                tagIds: next.tagIds && next.tagIds.length > 0 ? [...next.tagIds] : undefined,
              },
              to: "/transactions",
            });
          }}
        />
      }
    >
      <div className="flex min-h-0 h-full min-w-0 flex-1 flex-col">
        <TransactionsTable
          categoryOptions={categoryPickerOptions}
          hasActiveFilters={hasActiveFilters}
          isComplete={isComplete}
          items={items}
          locationSearch={locationSearch}
          merchantSearch={merchantSearch}
          onClearFilters={handleClearFilters}
          onConnectAccount={openAddAccount}
          onDeleteTransaction={handleDeleteTransaction}
          onRowSelectionChange={setRowSelection}
          onSetCategory={handleSetCategory}
          onSetDate={handleSetDate}
          onSetLocation={handleSetLocation}
          onSetMerchant={handleSetMerchant}
          onSetName={handleSetName}
          onSetTags={handleSetTags}
          rowSelection={rowSelection}
          tagOptions={tagOptions}
          tagsById={tagsById}
        />
      </div>
      <SelectionActionBar
        count={selectedCount}
        onClear={clearSelection}
        onOpenActions={handleOpenBulkActions}
      />
    </SidebarShellLayout>
  );
}
