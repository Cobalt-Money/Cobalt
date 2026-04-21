import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";

/** Subscribes to brokerage data — SnapTrade accounts and Plaid investment accounts. */
export function useBrokerage() {
  const [accounts, accountsResult] = useQuery(queries.brokerage.accounts());
  const [positions, positionsResult] = useQuery(queries.brokerage.positions());
  const [recentActivities, recentActivitiesResult] = useQuery(
    queries.brokerage.recentActivities()
  );
  const [portfolioSnapshots, portfolioSnapshotsResult] = useQuery(
    queries.brokerage.portfolioSnapshots()
  );
  const [plaidInvestmentAccounts, plaidInvestmentAccountsResult] = useQuery(
    queries.brokerage.plaidInvestmentAccounts()
  );
  const [plaidPositions, plaidPositionsResult] = useQuery(
    queries.brokerage.plaidPositions()
  );
  const [plaidActivities, plaidActivitiesResult] = useQuery(
    queries.brokerage.plaidActivities()
  );

  const accountsComplete =
    accountsResult.type === "complete" &&
    plaidInvestmentAccountsResult.type === "complete";
  const balanceComplete =
    accountsComplete &&
    portfolioSnapshotsResult.type === "complete" &&
    plaidPositionsResult.type === "complete";
  const activitiesComplete =
    accountsComplete &&
    recentActivitiesResult.type === "complete" &&
    plaidActivitiesResult.type === "complete";
  const positionsComplete =
    accountsComplete &&
    positionsResult.type === "complete" &&
    plaidPositionsResult.type === "complete";

  return {
    accounts,
    accountsComplete,
    activitiesComplete,
    balanceComplete,
    plaidActivities,
    plaidInvestmentAccounts,
    plaidPositions,
    portfolioSnapshots,
    positions,
    positionsComplete,
    recentActivities,
  };
}
