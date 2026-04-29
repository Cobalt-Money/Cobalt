import type { ExportFormat } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import { exportTransactions } from "@cobalt-web/ui/cobalt/transactions/lib/export";
import { TransactionsTable } from "@cobalt-web/ui/cobalt/transactions/transactions-table";
import { TransactionsToolbar } from "@cobalt-web/ui/cobalt/transactions/transactions-toolbar";
import { queries } from "@cobalt-web/zero";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { RowSelectionState } from "@tanstack/react-table";
import { useCallback, useState } from "react";

import { useAddAccount } from "@/components/accounts/add-account-provider";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { useAddTransaction } from "@/components/transactions/add-transaction-provider";
import { useBankOptions } from "@/hooks/use-bank-options";
import { useTransactions } from "@/hooks/use-transactions";

import type { TransactionsSearch } from "./route";

export const Route = createFileRoute("/_auth/transactions/")({
  component: TransactionsListPage,
  loader: ({ context, deps }) => {
    context.zero.run(queries.accounts.bankAccounts());
    context.zero.run(queries.transactions.list(deps));
  },
  loaderDeps: ({ search }): TransactionsSearch => ({
    amount: search.amount,
    amountMax: search.amountMax,
    amountMin: search.amountMin,
    bank: search.bank,
    status: search.status,
  }),
  staticData: { title: "Transactions" },
});

function TransactionsListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const bankOptions = useBankOptions();
  const { openAddAccount } = useAddAccount();
  const { openAddTransaction } = useAddTransaction();
  const { isComplete, items } = useTransactions({
    amount: search.amount,
    amountMax: search.amountMax,
    amountMin: search.amountMin,
    bank: search.bank,
    status: search.status,
  });

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectedCount = Object.keys(rowSelection).length;

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const selected =
        selectedCount > 0
          ? items.filter((item) => rowSelection[item.id])
          : items;
      if (selected.length === 0) {
        return;
      }
      exportTransactions(selected, format);
    },
    [items, rowSelection, selectedCount]
  );

  return (
    <SidebarShellLayout
      flushBottom
      toolbar={
        <TransactionsToolbar
          bankOptions={bankOptions}
          filters={search}
          onAddTransaction={openAddTransaction}
          onExport={handleExport}
          selectedCount={selectedCount}
          onFiltersChange={(next) => {
            navigate({
              replace: true,
              search: {
                amount:
                  next.amount && next.amount !== "all"
                    ? next.amount
                    : undefined,
                amountMax:
                  typeof next.amountMax === "number"
                    ? next.amountMax
                    : undefined,
                amountMin:
                  typeof next.amountMin === "number" && next.amountMin > 0
                    ? next.amountMin
                    : undefined,
                bank:
                  next.bank && next.bank.length > 0
                    ? [...next.bank]
                    : undefined,
                status:
                  next.status && next.status !== "all"
                    ? next.status
                    : undefined,
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
        />
      </div>
    </SidebarShellLayout>
  );
}
