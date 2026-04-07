import { mergeAndSortAccountCards } from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import type {
  BankAccountRowWithRelations,
  BrokerageRowWithRelations,
} from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

export function useAccounts() {
  const [bankRows, bankResult] = useQuery(queries.accounts.bankAccounts());
  const [brokerageRows, brokerageResult] = useQuery(
    queries.accounts.brokerageAccounts()
  );

  const items = useMemo(
    () =>
      mergeAndSortAccountCards(
        bankRows as BankAccountRowWithRelations[],
        brokerageRows as BrokerageRowWithRelations[]
      ),
    [bankRows, brokerageRows]
  );

  return {
    isComplete:
      bankResult.type === "complete" && brokerageResult.type === "complete",
    items,
  };
}
