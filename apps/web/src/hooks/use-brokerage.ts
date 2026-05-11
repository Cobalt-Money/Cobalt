import type { FinancialAccount, Row } from "@cobalt-web/zero";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

import type { PositionRow } from "@/components/brokerage/positions-table";
import type { ActivityRow } from "@/components/brokerage/recent-activity-card";

import { activityToActivityRow, holdingToPositionRow } from "./lib/brokerage-normalizers";

type SnaptradeAccountRow = Row<typeof queries.brokerage.accounts>;
type PlaidInvestmentAccountRow = Row<typeof queries.brokerage.plaidInvestmentAccounts>;

/**
 * Merged shape for the UI accounts list — base `financialAccount` columns
 * plus every relation either source can carry, all optional. SnapTrade rows
 * fill `snaptradeAuthorization` + `holdings`; Plaid rows fill `plaidConnection`.
 */
export type InvestmentAccountRow = FinancialAccount & {
  balance?: SnaptradeAccountRow["balance"];
  holdings?: SnaptradeAccountRow["holdings"];
  snaptradeAuthorization?: SnaptradeAccountRow["snaptradeAuthorization"] | null;
  plaidConnection?: PlaidInvestmentAccountRow["plaidConnection"] | null;
};

/**
 * Brokerage accounts + positions. Activities live in `useBrokerageActivities`
 * to keep callers (e.g. the home dashboard) from subscribing to ~50-row
 * activity feeds they never read.
 */
export function useBrokerage() {
  const [snaptradeAccounts, snaptradeAccountsResult] = useQuery(queries.brokerage.accounts());
  const [allPositions, allPositionsResult] = useQuery(queries.brokerage.positions());
  const [plaidInvestmentAccounts, plaidInvestmentAccountsResult] = useQuery(
    queries.brokerage.plaidInvestmentAccounts(),
  );

  const accounts = useMemo<InvestmentAccountRow[]>(() => {
    const pl: InvestmentAccountRow[] = plaidInvestmentAccounts.map((a) => ({
      ...a,
      institutionName: a.plaidConnection?.institution?.name ?? a.institutionName ?? null,
    }));
    return [...snaptradeAccounts, ...pl];
  }, [snaptradeAccounts, plaidInvestmentAccounts]);

  const positions = useMemo<PositionRow[]>(
    () => allPositions.map(holdingToPositionRow),
    [allPositions],
  );

  const accountsComplete =
    snaptradeAccountsResult.type === "complete" &&
    plaidInvestmentAccountsResult.type === "complete";
  const positionsComplete = accountsComplete && allPositionsResult.type === "complete";

  return {
    accounts,
    accountsComplete,
    positions,
    positionsComplete,
  };
}

export function useBrokerageActivities() {
  const [allActivities, allActivitiesResult] = useQuery(queries.brokerage.recentActivities());

  const activities = useMemo<ActivityRow[]>(
    () =>
      allActivities
        .map(activityToActivityRow)
        .toSorted((a, b) => (b.tradeDate ?? 0) - (a.tradeDate ?? 0)),
    [allActivities],
  );

  const activitiesComplete = allActivitiesResult.type === "complete";

  return { activities, activitiesComplete };
}
