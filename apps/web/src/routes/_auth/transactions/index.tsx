import type { ExportFormat } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import { exportTransactions } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import type { TransactionTagsById } from "@cobalt-web/ui/cobalt/transactions/transactions-table";
import { TransactionsTable } from "@cobalt-web/ui/cobalt/transactions/transactions-table";
import { TransactionsToolbar } from "@cobalt-web/ui/cobalt/transactions/transactions-toolbar";
import type { TagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { isTagColor } from "@cobalt-web/ui/cobalt/transactions/tags/palette";
import { queries } from "@cobalt-web/zero";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { useCommandMenu } from "@/components/shell/command-menu";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { useBankOptions } from "@/hooks/use-bank-options";
import { useAllCategories } from "@/hooks/use-categories";
import { useTagOptions, useTags } from "@/hooks/use-tags";
import { useTransactions } from "@/hooks/use-transactions";

import type { TransactionsSearch } from "./route";

export const Route = createFileRoute("/_auth/transactions/")({
  component: TransactionsListPage,
  loader: ({ context, deps }) => {
    context.zero.run(queries.accounts.bankAccounts());
    context.zero.run(queries.transactions.list(deps));
    context.zero.run(queries.tags.list());
  },
  loaderDeps: ({ search }): TransactionsSearch => ({
    amount: search.amount,
    amountMax: search.amountMax,
    amountMin: search.amountMin,
    bank: search.bank,
    categoryIds: search.categoryIds,
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
  const { data: allTags } = useTags();
  const { data: allCategories } = useAllCategories();
  const categoryOptions = useMemo(
    () =>
      allCategories
        .filter((c) => !c.hidden)
        .map((c) => ({
          groupName: c.group?.name ?? null,
          id: c.id,
          name: c.name,
        })),
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
    status: search.status,
    tagIds: search.tagIds,
  });

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectedCount = Object.keys(rowSelection).length;
  const { openAddAccount, openAddTransaction, openManageTags } = useCommandMenu();

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const selected = selectedCount > 0 ? items.filter((item) => rowSelection[item.id]) : items;
      if (selected.length === 0) {
        return;
      }
      exportTransactions(selected, format);
    },
    [items, rowSelection, selectedCount],
  );

  return (
    <SidebarShellLayout
      flushBottom
      toolbar={
        <TransactionsToolbar
          bankOptions={bankOptions}
          categoryOptions={categoryOptions}
          filters={search}
          onAddTransaction={openAddTransaction}
          onExport={handleExport}
          onManageCategories={() => navigate({ to: "/transactions/categories" })}
          onManageTags={openManageTags}
          selectedCount={selectedCount}
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
          isComplete={isComplete}
          items={items}
          onConnectAccount={openAddAccount}
          onRowSelectionChange={setRowSelection}
          rowSelection={rowSelection}
          tagsById={tagsById}
        />
      </div>
    </SidebarShellLayout>
  );
}
