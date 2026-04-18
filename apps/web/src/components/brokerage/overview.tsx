import type { BrokerageRowWithRelations } from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import { BrokerageEmpty } from "@cobalt-web/ui/cobalt/brokerage/brokerage-empty";
import type {
  BrokerageScope,
  ScopeAccount,
} from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { brokerageInstitutionBranding } from "@cobalt-web/ui/cobalt/logos/brokerage-institution-branding";
import { useMemo, useState } from "react";

import { useBrokerage } from "@/hooks/use-brokerage";

import type {
  PlaidPositionRow,
  PortfolioSnapshotRow,
} from "./balance-chart-card";
import { BalanceChartCard } from "./balance-chart-card";
import type { PositionRow } from "./positions-table";
import { PositionsTable } from "./positions-table";
import type { ActivityRow } from "./recent-activity-card";
import { RecentActivityCard } from "./recent-activity-card";

interface PlaidInvestmentAccountRow {
  id: string;
  plaidAccountId: string;
  name: string;
  mask?: string | null;
  connection?: {
    institutionLogo?: string | null;
    institution?: {
      logo?: string | null;
      name?: string | null;
      url?: string | null;
    } | null;
  } | null;
}

interface PlaidActivityRow {
  id: string;
  plaidAccountId: string;
  type: string;
  subtype: string;
  amount: number;
  price: number;
  date: string;
  isoCurrencyCode?: string | null;
  account?: { name?: string | null } | null;
  security?: { tickerSymbol?: string | null; name?: string | null } | null;
}

export function Overview() {
  const {
    accounts,
    positions,
    recentActivities,
    portfolioSnapshots,
    plaidInvestmentAccounts,
    plaidPositions,
    plaidActivities,
  } = useBrokerage();

  const typedAccounts =
    accounts as unknown as readonly BrokerageRowWithRelations[];
  const typedPositions = positions as unknown as readonly PositionRow[];
  const typedRecentActivities =
    recentActivities as unknown as readonly ActivityRow[];
  const typedPortfolioSnapshots =
    portfolioSnapshots as unknown as readonly PortfolioSnapshotRow[];
  const typedPlaidInvestmentAccounts =
    plaidInvestmentAccounts as unknown as readonly PlaidInvestmentAccountRow[];
  const typedPlaidPositions =
    plaidPositions as unknown as readonly PlaidPositionRow[];
  const typedPlaidActivities =
    plaidActivities as unknown as readonly PlaidActivityRow[];

  const [brokerageScope, setBrokerageScope] = useState<BrokerageScope>({
    type: "all",
  });

  const scopedAccountIds = useMemo(() => {
    if (brokerageScope.type === "all") {
      return null;
    }
    return new Set(brokerageScope.accountIds);
  }, [brokerageScope]);

  const scopeAccounts = useMemo((): ScopeAccount[] => {
    const snaptrade = typedAccounts.map((a): ScopeAccount => {
      const digits = (a.accountNumber ?? "").replaceAll(/\D/g, "");
      const mask = digits.length >= 4 ? `···${digits.slice(-4)}` : null;
      const base = a.name?.trim() || a.accountType?.trim() || "Account";
      const branding = brokerageInstitutionBranding(a);
      return {
        displayName: mask ? `${base} ${mask}` : base,
        id: a.id,
        institutionLogo: branding.institutionLogo,
        institutionLogosExtra:
          branding.institutionLogosExtra.length > 0
            ? branding.institutionLogosExtra
            : null,
        institutionName:
          a.institutionName?.trim() ||
          (
            a.brokerageAuthorization as { name?: string } | undefined
          )?.name?.trim() ||
          "Brokerage",
        institutionUrl: branding.institutionUrl,
      };
    });
    const plaid = typedPlaidInvestmentAccounts.map((a): ScopeAccount => {
      const mask = a.mask ? `···${a.mask}` : null;
      const base = a.name?.trim() || "Investment";
      const inst = a.connection?.institution;
      return {
        displayName: mask ? `${base} ${mask}` : base,
        id: `plaid-inv-${a.plaidAccountId}`,
        institutionLogo:
          inst?.logo?.trim() ?? a.connection?.institutionLogo?.trim() ?? null,
        institutionName: inst?.name?.trim() || "Investment",
        institutionUrl: inst?.url?.trim() ?? null,
      };
    });
    return [...snaptrade, ...plaid];
  }, [typedAccounts, typedPlaidInvestmentAccounts]);

  const normalizedPlaidPositions = useMemo(
    () =>
      typedPlaidPositions.map(
        (p): PositionRow => ({
          averagePurchasePrice:
            p.costBasis !== undefined && p.costBasis !== null && p.quantity > 0
              ? p.costBasis / p.quantity
              : null,
          brokerageAccount: {
            id: `plaid-inv-${p.plaidAccountId}`,
            name: p.account?.name ?? null,
          },
          currencyCode: p.isoCurrencyCode ?? null,
          id: `plaid-pos-${p.id}`,
          openPnl:
            p.costBasis !== undefined && p.costBasis !== null
              ? p.institutionValue - p.costBasis
              : null,
          price: p.institutionPrice,
          symbol: p.security?.tickerSymbol ?? null,
          symbolDescription: p.security?.name ?? null,
          units: p.quantity,
        })
      ),
    [typedPlaidPositions]
  );

  const normalizedPlaidActivities = useMemo(
    () =>
      typedPlaidActivities.map(
        (a): ActivityRow => ({
          amount: a.amount,
          brokerageAccount: {
            id: `plaid-inv-${a.plaidAccountId}`,
            name: a.account?.name ?? null,
          },
          id: `plaid-act-${a.id}`,
          price: a.price,
          symbolDescription: a.security?.name ?? null,
          symbolTicker: a.security?.tickerSymbol ?? null,
          tradeDate: a.date ? new Date(a.date).getTime() : null,
          type: a.subtype || a.type,
        })
      ),
    [typedPlaidActivities]
  );

  const allPositions = useMemo(
    () => [...typedPositions, ...normalizedPlaidPositions],
    [typedPositions, normalizedPlaidPositions]
  );

  const allActivities = useMemo(
    () =>
      [...typedRecentActivities, ...normalizedPlaidActivities].toSorted(
        (a, b) => (b.tradeDate ?? 0) - (a.tradeDate ?? 0)
      ),
    [typedRecentActivities, normalizedPlaidActivities]
  );

  const scopedPositions = useMemo(() => {
    if (scopedAccountIds === null) {
      return allPositions;
    }
    return allPositions.filter(
      (p) =>
        p.brokerageAccount?.id !== undefined &&
        p.brokerageAccount?.id !== null &&
        scopedAccountIds.has(p.brokerageAccount.id)
    );
  }, [allPositions, scopedAccountIds]);

  const scopedActivities = useMemo(() => {
    if (scopedAccountIds === null) {
      return allActivities;
    }
    return allActivities.filter(
      (a) =>
        a.brokerageAccount?.id !== undefined &&
        a.brokerageAccount?.id !== null &&
        scopedAccountIds.has(a.brokerageAccount.id)
    );
  }, [allActivities, scopedAccountIds]);

  const isEmpty =
    typedAccounts.length === 0 && typedPlaidInvestmentAccounts.length === 0;

  if (isEmpty) {
    return (
      <div className="w-full min-w-0 py-2 sm:py-3">
        <BrokerageEmpty />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 py-2 sm:py-3">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <BalanceChartCard
          brokerageScope={brokerageScope}
          onScopeChange={setBrokerageScope}
          plaidPositions={typedPlaidPositions}
          portfolioSnapshots={typedPortfolioSnapshots}
          scopedAccountIds={scopedAccountIds}
          scopeAccounts={scopeAccounts}
        />
        <RecentActivityCard
          allActivities={allActivities}
          scopedActivities={scopedActivities}
        />
      </div>

      <PositionsTable
        allPositions={allPositions}
        scopedPositions={scopedPositions}
      />
    </div>
  );
}
