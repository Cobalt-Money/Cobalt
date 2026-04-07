import { AccountsList } from "@cobalt-web/ui/cobalt/accounts/accounts-list";
import { createFileRoute } from "@tanstack/react-router";

import { useAccounts } from "@/hooks/use-accounts";

import { useAccountsLayout } from "./accounts-layout-context";

export const Route = createFileRoute("/_auth/accounts/")({
  component: AccountsListPage,
  staticData: { title: "Accounts" },
});

function AccountsListPage() {
  const { activeFilter } = useAccountsLayout();
  const { isComplete, items } = useAccounts();

  return (
    <AccountsList
      activeFilter={activeFilter}
      isComplete={isComplete}
      items={items}
    />
  );
}
