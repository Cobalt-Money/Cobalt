import { BrokerageEmpty } from "@cobalt-web/ui/cobalt/brokerage/brokerage-empty";
import type {
  BrokerageScope,
  ScopeAccount,
} from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { brokerageInstitutionBranding } from "@cobalt-web/ui/cobalt/logos/brokerage-institution-branding";
import { useMemo, useState } from "react";

import { useCommandMenu } from "@/components/shell/command-menu";
import { useBrokerage } from "@/hooks/use-brokerage";

import { BalanceChartCard } from "./balance-chart-card";
import { PositionsTable } from "./positions-table";
import { RecentActivityCard } from "./recent-activity-card";

type BrokerageAccount = ReturnType<typeof useBrokerage>["accounts"][number];

function plaidAccountToScope(a: BrokerageAccount): ScopeAccount {
  const mask = a.mask ? `···${a.mask}` : null;
  const base = a.name?.trim() || "Investment";
  const inst = a.plaidConnection?.institution;
  return {
    displayName: mask ? `${base} ${mask}` : base,
    id: a.id,
    institutionLogo:
      inst?.logo?.trim() ?? a.plaidConnection?.institutionLogo?.trim() ?? null,
    institutionName: inst?.name?.trim() || "Investment",
    institutionUrl: inst?.url?.trim() ?? null,
  };
}

function snaptradeAccountToScope(a: BrokerageAccount): ScopeAccount {
  const digits = (a.accountNumber ?? "").replaceAll(/\D/g, "");
  const mask = digits.length >= 4 ? `···${digits.slice(-4)}` : null;
  const base =
    a.name?.trim() || a.subtype?.trim() || a.type?.trim() || "Account";
  const branding = brokerageInstitutionBranding({
    institutionName: a.institutionName ?? null,
    snaptradeAuthorization: a.snaptradeAuthorization ?? null,
  });
  const snaptradeAuthName = (
    a.snaptradeAuthorization as { name?: string } | undefined
  )?.name?.trim();
  return {
    displayName: mask ? `${base} ${mask}` : base,
    id: a.id,
    institutionLogo: branding.institutionLogo,
    institutionLogosExtra:
      branding.institutionLogosExtra.length > 0
        ? branding.institutionLogosExtra
        : null,
    institutionName:
      a.institutionName?.trim() || snaptradeAuthName || "Brokerage",
    institutionUrl: branding.institutionUrl,
  };
}

function accountToScope(a: BrokerageAccount): ScopeAccount {
  if (a.source === "plaid") {
    return plaidAccountToScope(a);
  }
  return snaptradeAccountToScope(a);
}

export function Overview() {
  const { openAddAccount } = useCommandMenu();
  const {
    accounts,
    accountsComplete,
    activities,
    portfolioSnapshots,
    positions,
  } = useBrokerage();

  const [brokerageScope, setBrokerageScope] = useState<BrokerageScope>({
    type: "all",
  });

  const scopedAccountIds = useMemo(() => {
    if (brokerageScope.type === "all") {
      return null;
    }
    return new Set(brokerageScope.accountIds);
  }, [brokerageScope]);

  const scopeAccounts = useMemo(
    (): ScopeAccount[] => accounts.map(accountToScope),
    [accounts]
  );

  const scopedPositions = useMemo(() => {
    if (scopedAccountIds === null) {
      return positions;
    }
    return positions.filter(
      (p) =>
        p.brokerageAccount?.id !== undefined &&
        p.brokerageAccount?.id !== null &&
        scopedAccountIds.has(p.brokerageAccount.id)
    );
  }, [positions, scopedAccountIds]);

  const scopedActivities = useMemo(() => {
    if (scopedAccountIds === null) {
      return activities;
    }
    return activities.filter(
      (a) =>
        a.brokerageAccount?.id !== undefined &&
        a.brokerageAccount?.id !== null &&
        scopedAccountIds.has(a.brokerageAccount.id)
    );
  }, [activities, scopedAccountIds]);

  if (accountsComplete && accounts.length === 0) {
    return (
      <div className="w-full min-w-0 py-2 sm:py-3">
        <BrokerageEmpty onConnect={openAddAccount} />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 py-2 sm:py-3">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <BalanceChartCard
          brokerageScope={brokerageScope}
          onScopeChange={setBrokerageScope}
          portfolioSnapshots={portfolioSnapshots}
          positions={positions}
          scopedAccountIds={scopedAccountIds}
          scopeAccounts={scopeAccounts}
        />
        <RecentActivityCard
          allActivities={activities}
          scopedActivities={scopedActivities}
        />
      </div>

      <PositionsTable
        allPositions={positions}
        scopedPositions={scopedPositions}
      />
    </div>
  );
}
