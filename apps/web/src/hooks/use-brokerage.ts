import type {
  Balance,
  FinancialAccount,
  Institution,
  PlaidConnection,
  SnaptradeAuthorization,
} from "@cobalt-web/zero";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

import type { PositionRow } from "@/components/brokerage/positions-table";
import type { ActivityRow } from "@/components/brokerage/recent-activity-card";

import { activityToActivityRow, holdingToPositionRow } from "./lib/brokerage-normalizers";
import type { RawHolding, RawInvestmentActivity } from "./lib/brokerage-normalizers";

export type InvestmentAccountRow = Pick<
  FinancialAccount,
  | "id"
  | "source"
  | "name"
  | "mask"
  | "accountNumber"
  | "institutionName"
  | "type"
  | "subtype"
  | "externalId"
> & {
  plaidConnection?:
    | (Pick<PlaidConnection, "institutionLogo"> & {
        institution?: Pick<Institution, "logo" | "name" | "url"> | null;
      })
    | null;
  snaptradeAuthorization?: Pick<
    SnaptradeAuthorization,
    "authorizationId" | "brokerage" | "brokerageSlug" | "name" | "meta"
  > | null;
  balance?: Pick<Balance, "updatedAt"> | null;
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
    const sn: readonly InvestmentAccountRow[] = snaptradeAccounts;
    const pl: readonly InvestmentAccountRow[] = plaidInvestmentAccounts.map((a) => ({
      ...a,
      institutionName: a.plaidConnection?.institution?.name ?? a.institutionName ?? null,
    }));
    return [...sn, ...pl];
  }, [snaptradeAccounts, plaidInvestmentAccounts]);

  const positions = useMemo<PositionRow[]>(
    () => (allPositions as readonly RawHolding[]).map(holdingToPositionRow),
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
      (allActivities as readonly RawInvestmentActivity[])
        .map(activityToActivityRow)
        .toSorted((a, b) => (b.tradeDate ?? 0) - (a.tradeDate ?? 0)),
    [allActivities],
  );

  const activitiesComplete = allActivitiesResult.type === "complete";

  return { activities, activitiesComplete };
}
