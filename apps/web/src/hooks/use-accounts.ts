import { mergeAndSortAccountCards } from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

export function useAccounts() {
  const [bankRows, bankResult] = useQuery(queries.accounts.bankAccounts());
  const [brokerageRows, brokerageResult] = useQuery(queries.brokerage.accounts());

  const items = useMemo(
    () => mergeAndSortAccountCards(bankRows, brokerageRows),
    [bankRows, brokerageRows],
  );

  return {
    isComplete: bankResult.type === "complete" && brokerageResult.type === "complete",
    items,
  };
}
