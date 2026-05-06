import { AccountsList } from "@cobalt-web/ui/cobalt/accounts/accounts-list";
import { mutators, queries } from "@cobalt-web/zero";
import { useZero } from "@rocicorp/zero/react";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

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
  const zero = useZero();

  const onRenameAccount = useCallback(
    (id: string, customName: string) => {
      const next = customName.trim();
      const { server } = zero.mutate(
        mutators.accounts.updateAccountName({
          customName: next.length === 0 ? null : next,
          id,
        }),
      );
      void (async () => {
        try {
          const result = await server;
          if (result.type === "error") {
            toast.error(result.error.message);
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to rename account");
        }
      })();
    },
    [zero],
  );

  return (
    <AccountsList
      activeFilter={activeFilter}
      isComplete={isComplete}
      items={items}
      onConnectAccount={openAddAccount}
      onRenameAccount={onRenameAccount}
    />
  );
}
