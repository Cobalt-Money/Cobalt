import type { TransactionListItem } from "@cobalt-web/server-data/transactions/schemas";
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
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
import { mutators, queries } from "@cobalt-web/zero";
import {
  TRANSACTION_LIST_DEFAULT_LIMIT,
  TRANSACTION_LIST_MAX_LIMIT,
} from "@cobalt-web/zero/transactions/lib";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCommandMenu } from "@/components/shell/command-menu";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { useAddTransactionData } from "@/hooks/use-add-transaction-data";
import { useBankOptions } from "@/hooks/use-bank-options";
import { useBulkSetCategory } from "@/hooks/use-bulk-transactions";
import { useSetTransactionTags, useTagOptions } from "@/hooks/use-tags";
import { transactionsListQuery, useTransactions } from "@/hooks/use-transactions";

import type { TransactionsSearch } from "./route";

export const Route = createFileRoute("/_auth/transactions/")({
  component: TransactionsListPage,
  loader: ({ context, deps }) => {
    context.zero.run(queries.accounts.bankAccounts());
    context.zero.run(transactionsListQuery(deps));
    context.zero.run(queries.tags.list());
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

function filterSignature(search: TransactionsSearch): string {
  return [
    search.amount,
    search.amountMin,
    search.amountMax,
    search.bank?.join(","),
    search.categoryIds?.join(","),
    search.status,
    search.tagIds?.join(","),
  ].join("|");
}

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
  // Reset paging window when filters change so we don't keep an oversized subscription.
  const filterKey = filterSignature(search);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  const [limit, setLimit] = useState<number>(TRANSACTION_LIST_DEFAULT_LIMIT);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setLimit(TRANSACTION_LIST_DEFAULT_LIMIT);
  }
  const { isComplete, items } = useTransactions({
    amount: search.amount,
    amountMax: search.amountMax,
    amountMin: search.amountMin,
    bank: search.bank,
    categoryIds: search.categoryIds,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    limit,
    query: search.query,
    status: search.status,
    tagIds: search.tagIds,
  });
  const canLoadMore = isComplete && items.length >= limit && limit < TRANSACTION_LIST_MAX_LIMIT;
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
  const handleEndReached = useCallback(() => {
    setLimit((prev) => Math.min(prev + TRANSACTION_LIST_DEFAULT_LIMIT, TRANSACTION_LIST_MAX_LIMIT));
  }, []);

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

  const zero = useZero();
  const { locationSearch, merchantSearch } = useAddTransactionData();
  const { mutateAsync: bulkSetCategory } = useBulkSetCategory();
  const { mutate: setTransactionTags } = useSetTransactionTags();
  const handleSetCategory = useCallback(
    (transactionId: string, categoryId: string) => {
      void bulkSetCategory({ categoryId, transactionIds: [transactionId] });
    },
    [bulkSetCategory],
  );
  const handleSetTags = useCallback(
    (transactionId: string, tagIds: string[]) => {
      setTransactionTags({ tagIds, transactionId });
    },
    [setTransactionTags],
  );
  const handleSetDate = useCallback(
    (transactionId: string, dateIso: string) => {
      const { server } = zero.mutate(
        mutators.transaction.updateDate({
          date: dateIso,
          editId: crypto.randomUUID(),
          id: transactionId,
        }),
      );
      void (async () => {
        try {
          await server;
        } catch (error) {
          console.error("[transaction.updateDate]", error);
        }
      })();
    },
    [zero],
  );
  const handleSetName = useCallback(
    (transactionId: string, name: string) => {
      const { server } = zero.mutate(
        mutators.transaction.updateName({
          editId: crypto.randomUUID(),
          id: transactionId,
          name,
        }),
      );
      void (async () => {
        try {
          await server;
        } catch (error) {
          console.error("[transaction.updateName]", error);
        }
      })();
    },
    [zero],
  );
  const handleSetMerchant = useCallback(
    (transactionId: string, merchant: { merchantName: string | null; website: string | null }) => {
      const { server } = zero.mutate(
        mutators.transaction.updateMerchant({
          editId: crypto.randomUUID(),
          id: transactionId,
          merchantName: merchant.merchantName,
          website: merchant.website,
        }),
      );
      void (async () => {
        try {
          await server;
        } catch (error) {
          console.error("[transaction.updateMerchant]", error);
        }
      })();
    },
    [zero],
  );
  const handleSetLocation = useCallback(
    (transactionId: string, location: NonNullable<TransactionListItem["location"]>) => {
      const { server } = zero.mutate(
        mutators.transaction.updateLocation({
          editId: crypto.randomUUID(),
          id: transactionId,
          location,
        }),
      );
      void (async () => {
        try {
          await server;
        } catch (error) {
          console.error("[transaction.updateLocation]", error);
        }
      })();
    },
    [zero],
  );
  const handleDeleteTransaction = useCallback(
    (transactionId: string) => {
      const { server } = zero.mutate(mutators.transaction.deleteTransaction({ id: transactionId }));
      cobaltToast.transactionDeleted();
      void (async () => {
        try {
          await server;
        } catch (error) {
          console.error("[transaction.deleteTransaction]", error);
          cobaltToast.error("Couldn't delete transaction. Please try again.");
        }
      })();
    },
    [zero],
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
          onEndReached={canLoadMore ? handleEndReached : undefined}
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
