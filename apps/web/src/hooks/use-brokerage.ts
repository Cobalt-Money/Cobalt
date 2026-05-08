import type { BrokerageRowWithRelations } from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

import type { PositionRow } from "@/components/brokerage/balance-chart-card";
import type { ActivityRow } from "@/components/brokerage/recent-activity-card";

import { activityToActivityRow, holdingToPositionRow } from "./lib/brokerage-normalizers";
import type { RawHolding, RawInvestmentActivity } from "./lib/brokerage-normalizers";

/** Investment account row — both SnapTrade and Plaid investment accounts. */
export interface InvestmentAccountRow {
  id: string;
  source: "snaptrade" | "plaid";
  name?: string | null;
  mask?: string | null;
  accountNumber?: string | null;
  institutionName?: string | null;
  type?: string | null;
  subtype?: string | null;
  externalId?: string | null;
  plaidConnection?: {
    institutionLogo?: string | null;
    institution?: {
      logo?: string | null;
      name?: string | null;
      url?: string | null;
    } | null;
  } | null;
  snaptradeAuthorization?: {
    authorizationId?: string | null;
    brokerage?: string | null;
    brokerageSlug?: string | null;
    name?: string | null;
    meta?: unknown | null;
  } | null;
  balance?: { updatedAt?: number | null } | null;
}

/**
 * Subscribes to brokerage data — SnapTrade + Plaid investment accounts merged
 * into source-agnostic lists. Consumers branch on `source` only when they
 * need a provider-specific reconnect/disconnect path.
 */
export function useBrokerage() {
  const [snaptradeAccounts, snaptradeAccountsResult] = useQuery(queries.brokerage.accounts());
  const [snaptradePositions, snaptradePositionsResult] = useQuery(queries.brokerage.positions());
  const [snaptradeActivities, snaptradeActivitiesResult] = useQuery(
    queries.brokerage.recentActivities(),
  );
  const [plaidInvestmentAccounts, plaidInvestmentAccountsResult] = useQuery(
    queries.brokerage.plaidInvestmentAccounts(),
  );
  const [plaidPositions, plaidPositionsResult] = useQuery(queries.brokerage.plaidPositions());
  const [plaidActivities, plaidActivitiesResult] = useQuery(queries.brokerage.plaidActivities());

  const accounts = useMemo<InvestmentAccountRow[]>(() => {
    const sn = (snaptradeAccounts as unknown as readonly BrokerageRowWithRelations[]).map(
      (a): InvestmentAccountRow => ({
        accountNumber: a.accountNumber ?? null,
        externalId: a.externalId ?? null,
        id: a.id,
        institutionName: a.institutionName ?? null,
        name: a.name ?? null,
        snaptradeAuthorization: a.snaptradeAuthorization ?? null,
        source: "snaptrade",
        subtype: a.subtype ?? null,
        type: a.type ?? null,
      }),
    );
    const pl = (plaidInvestmentAccounts as unknown as readonly InvestmentAccountRow[]).map(
      (a): InvestmentAccountRow => ({
        balance: a.balance ?? null,
        externalId: a.externalId ?? null,
        id: a.id,
        institutionName: a.plaidConnection?.institution?.name ?? null,
        mask: a.mask ?? null,
        name: a.name ?? null,
        plaidConnection: a.plaidConnection ?? null,
        source: "plaid",
        subtype: a.subtype ?? null,
        type: a.type ?? "investment",
      }),
    );
    return [...sn, ...pl];
  }, [snaptradeAccounts, plaidInvestmentAccounts]);

  const positions = useMemo<PositionRow[]>(() => {
    const all = [
      ...(snaptradePositions as unknown as readonly RawHolding[]),
      ...(plaidPositions as unknown as readonly RawHolding[]),
    ];
    return all.map(holdingToPositionRow);
  }, [snaptradePositions, plaidPositions]);

  const activities = useMemo<ActivityRow[]>(() => {
    const all = [
      ...(snaptradeActivities as unknown as readonly RawInvestmentActivity[]),
      ...(plaidActivities as unknown as readonly RawInvestmentActivity[]),
    ];
    return all
      .map(activityToActivityRow)
      .toSorted((a, b) => (b.tradeDate ?? 0) - (a.tradeDate ?? 0));
  }, [snaptradeActivities, plaidActivities]);

  const accountsComplete =
    snaptradeAccountsResult.type === "complete" &&
    plaidInvestmentAccountsResult.type === "complete";
  const positionsComplete =
    accountsComplete &&
    snaptradePositionsResult.type === "complete" &&
    plaidPositionsResult.type === "complete";
  const activitiesComplete =
    accountsComplete &&
    snaptradeActivitiesResult.type === "complete" &&
    plaidActivitiesResult.type === "complete";

  return {
    accounts,
    accountsComplete,
    activities,
    activitiesComplete,
    positions,
    positionsComplete,
  };
}
