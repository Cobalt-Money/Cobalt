import type { BrokerageRowWithRelations } from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import type {
  BrokerageScope,
  ScopeAccount,
} from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";

import type { PortfolioSnapshotRow } from "./balance-chart-card";
import { BalanceChartCard } from "./balance-chart-card";
import type { PositionRow } from "./positions-table";
import { PositionsTable } from "./positions-table";
import type { ActivityRow } from "./recent-activity-card";
import { RecentActivityCard } from "./recent-activity-card";

const FIXTURE_SCOPE: BrokerageScope = { type: "all" };
const NOOP = () => {
  /* fixture only — never interactive */
};

const FIXTURE_SCOPE_ACCOUNTS: ScopeAccount[] = [
  {
    displayName: "Individual ···1234",
    id: "fixture-account-1",
    institutionLogo: null,
    institutionLogosExtra: null,
    institutionName: "Schwab",
    institutionUrl: null,
  },
  {
    displayName: "Roth IRA ···5678",
    id: "fixture-account-2",
    institutionLogo: null,
    institutionLogosExtra: null,
    institutionName: "Fidelity",
    institutionUrl: null,
  },
];

const FIXTURE_PORTFOLIO_SNAPSHOTS: PortfolioSnapshotRow[] = Array.from({ length: 60 }, (_, i) => ({
  accountId: "fixture-account-1",
  id: `snap-${i}`,
  snapshotDate: Date.now() - (60 - i) * 86_400_000,
  totalValue: 120_000 + Math.sin(i / 6) * 8000 + i * 320,
}));

const FIXTURE_POSITIONS: PositionRow[] = [
  {
    averagePurchasePrice: 180.12,
    brokerageAccount: { id: "fixture-account-1", name: "Individual" },
    currencyCode: "USD",
    id: "pos-1",
    openPnl: 3518,
    price: 215.3,
    symbol: "AAPL",
    symbolDescription: "Apple Inc.",
    units: 100,
  },
  {
    averagePurchasePrice: 320.44,
    brokerageAccount: { id: "fixture-account-1", name: "Individual" },
    currencyCode: "USD",
    id: "pos-2",
    openPnl: 1220,
    price: 332.65,
    symbol: "MSFT",
    symbolDescription: "Microsoft Corp.",
    units: 60,
  },
  {
    averagePurchasePrice: 240.8,
    brokerageAccount: { id: "fixture-account-2", name: "Roth IRA" },
    currencyCode: "USD",
    id: "pos-3",
    openPnl: -450,
    price: 237.8,
    symbol: "NVDA",
    symbolDescription: "NVIDIA Corp.",
    units: 150,
  },
  {
    averagePurchasePrice: 145.02,
    brokerageAccount: { id: "fixture-account-2", name: "Roth IRA" },
    currencyCode: "USD",
    id: "pos-4",
    openPnl: 620,
    price: 151.22,
    symbol: "GOOGL",
    symbolDescription: "Alphabet Inc.",
    units: 100,
  },
  {
    averagePurchasePrice: 86.5,
    brokerageAccount: { id: "fixture-account-1", name: "Individual" },
    currencyCode: "USD",
    id: "pos-5",
    openPnl: 205,
    price: 88.55,
    symbol: "AMD",
    symbolDescription: "Advanced Micro Devices",
    units: 100,
  },
];

const FIXTURE_ACTIVITIES: ActivityRow[] = [
  {
    amount: 2153,
    brokerageAccount: { id: "fixture-account-1", name: "Individual" },
    id: "act-1",
    price: 215.3,
    symbolDescription: "Apple Inc.",
    symbolTicker: "AAPL",
    tradeDate: Date.now() - 86_400_000,
    type: "BUY",
  },
  {
    amount: -996,
    brokerageAccount: { id: "fixture-account-2", name: "Roth IRA" },
    id: "act-2",
    price: 332.65,
    symbolDescription: "Microsoft Corp.",
    symbolTicker: "MSFT",
    tradeDate: Date.now() - 2 * 86_400_000,
    type: "SELL",
  },
  {
    amount: 500,
    brokerageAccount: { id: "fixture-account-1", name: "Individual" },
    id: "act-3",
    price: null,
    symbolDescription: "Dividend",
    symbolTicker: "VOO",
    tradeDate: Date.now() - 4 * 86_400_000,
    type: "DIV",
  },
];

export function BalanceChartCardFixture() {
  return (
    <BalanceChartCard
      brokerageScope={FIXTURE_SCOPE}
      onScopeChange={NOOP}
      portfolioSnapshots={FIXTURE_PORTFOLIO_SNAPSHOTS}
      positions={FIXTURE_POSITIONS}
      scopedAccountIds={null}
      scopeAccounts={FIXTURE_SCOPE_ACCOUNTS}
    />
  );
}

export function RecentActivityCardFixture() {
  return (
    <RecentActivityCard allActivities={FIXTURE_ACTIVITIES} scopedActivities={FIXTURE_ACTIVITIES} />
  );
}

export function PositionsTableFixture() {
  return <PositionsTable allPositions={FIXTURE_POSITIONS} scopedPositions={FIXTURE_POSITIONS} />;
}

export const _fixtureAccounts: readonly BrokerageRowWithRelations[] = [];
