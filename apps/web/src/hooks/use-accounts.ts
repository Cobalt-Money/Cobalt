import { mergeAndSortAccountCards } from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

export function useAccounts() {
  const [bankRows, bankResult] = useQuery(queries.accounts.bankAccounts());
  const [brokerageRows, brokerageResult] = useQuery(queries.brokerage.accounts());
  const [manualInvestmentRows, manualInvestmentResult] = useQuery(
    queries.brokerage.manualInvestmentAccounts(),
  );

  const items = useMemo(
    () => mergeAndSortAccountCards(bankRows, brokerageRows, manualInvestmentRows),
    [bankRows, brokerageRows, manualInvestmentRows],
  );

  return {
    isComplete:
      bankResult.type === "complete" &&
      brokerageResult.type === "complete" &&
      manualInvestmentResult.type === "complete",
    items,
  };
}
