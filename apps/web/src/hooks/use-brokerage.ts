import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";

/** Subscribes to brokerage data — SnapTrade accounts and Plaid investment accounts. */
export function useBrokerage() {
  const [accounts] = useQuery(queries.brokerage.accounts());
  const [positions] = useQuery(queries.brokerage.positions());
  const [recentActivities] = useQuery(queries.brokerage.recentActivities());
  const [portfolioSnapshots] = useQuery(queries.brokerage.portfolioSnapshots());
  const [plaidInvestmentAccounts] = useQuery(
    queries.brokerage.plaidInvestmentAccounts()
  );
  const [plaidPositions] = useQuery(queries.brokerage.plaidPositions());
  const [plaidActivities] = useQuery(queries.brokerage.plaidActivities());

  return {
    accounts,
    plaidActivities,
    plaidInvestmentAccounts,
    plaidPositions,
    portfolioSnapshots,
    positions,
    recentActivities,
  };
}
