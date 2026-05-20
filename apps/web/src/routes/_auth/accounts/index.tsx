import { AccountsList } from "@cobalt-web/ui/cobalt/accounts/accounts-list";
import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";

import { AccountConnectionActions } from "@/components/accounts/account-connection-actions";
import { useCommandMenu } from "@/components/shell/command-menu";
import { useAccounts } from "@/hooks/use-accounts";
import { useMutator } from "@/hooks/use-mutator";

import { useAccountsLayout } from "./accounts-layout-context";

export const Route = createFileRoute("/_auth/accounts/")({
  component: AccountsListPage,
  loader: ({ context }) => {
    context.zero.run(queries.accounts.bankAccounts());
    context.zero.run(queries.brokerage.accounts());
  },
  staticData: { title: "Accounts" },
});

function AccountsListPage() {
  const { activeFilter } = useAccountsLayout();
  const { isComplete, items } = useAccounts();
  const { openAddAccount } = useCommandMenu();
  const run = useMutator();

  const onRenameAccount = useCallback(
    (id: string, customName: string) => {
      const next = customName.trim();
      run(
        (m) =>
          m.accounts.updateAccountName({
            customName: next.length === 0 ? null : next,
            id,
          }),
        "Failed to rename account",
      );
    },
    [run],
  );

  return (
    <AccountsList
      activeFilter={activeFilter}
      isComplete={isComplete}
      items={items}
      onConnectAccount={openAddAccount}
      onRenameAccount={onRenameAccount}
      renderActions={(account) => <AccountConnectionActions account={account} />}
    />
  );
}
