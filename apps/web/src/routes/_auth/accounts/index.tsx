import { AccountsList } from "@cobalt-web/ui/cobalt/accounts/accounts-list";
import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import { useCommandMenu } from "@/components/shell/command-menu";
import { useAccounts } from "@/hooks/use-accounts";

import { useAccountsLayout } from "./accounts-layout-context";

export const Route = createFileRoute("/_auth/accounts/")({
  component: AccountsListPage,
  loader: ({ context }) => {
    context.zero.run(queries.accounts.bankAccounts());
    context.zero.run(queries.accounts.brokerageAccounts());
  },
  staticData: { title: "Accounts" },
});

function AccountsListPage() {
  const { activeFilter } = useAccountsLayout();
  const { isComplete, items } = useAccounts();
  const { openAddAccount } = useCommandMenu();

  return (
    <AccountsList
      activeFilter={activeFilter}
      isComplete={isComplete}
      items={items}
      onConnectAccount={openAddAccount}
    />
  );
}
