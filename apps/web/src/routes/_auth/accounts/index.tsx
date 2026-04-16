import { AccountsList } from "@cobalt-web/ui/cobalt/accounts/accounts-list";
import { queries } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { createFileRoute } from "@tanstack/react-router";

import { useAccounts } from "@/hooks/use-accounts";

import { useAccountsLayout } from "./accounts-layout-context";

export const Route = createFileRoute("/_auth/accounts/")({
  component: AccountsListPage,
  loader: ({ context }) => {
    const z = context.zero as unknown as Zero;
    z.run(queries.accounts.bankAccounts());
    z.run(queries.accounts.brokerageAccounts());
  },
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
