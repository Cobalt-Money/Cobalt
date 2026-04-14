"use client";

import type {
  BrokerageScope,
  ScopeAccount,
} from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { BrokerageScopePicker } from "@cobalt-web/ui/cobalt/brokerage/brokerage-scope-picker";
import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CardContent, CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { format } from "date-fns";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

const BALANCE_CHART_RANGE_OPTIONS = [
  "1W",
  "1M",
  "3M",
  "YTD",
  "1Y",
  "5Y",
  "All",
] as const;

type BalanceChartRange = (typeof BALANCE_CHART_RANGE_OPTIONS)[number];

interface PositionRow {
  id: string;
  symbol?: string | null;
  symbolDescription?: string | null;
  units?: number | null;
  averagePurchasePrice?: number | null;
  price?: number | null;
  openPnl?: number | null;
  brokerageAccount?: { name?: string | null } | null;
}

interface ActivityRow {
  id: string;
  type?: string | null;
  symbolTicker?: string | null;
  amount?: number | null;
  tradeDate?: number | null;
  brokerageAccount?: { name?: string | null } | null;
}

function openPnlToneClass(openPnl: number | null | undefined): string {
  if (openPnl === undefined || openPnl === null) {
    return "text-muted-foreground";
  }
  if (openPnl > 0) {
    return "text-green-550";
  }
  if (openPnl < 0) {
    return "text-red-600 dark:text-red-400";
  }
  return "text-muted-foreground";
}

function formatEpochDate(ms: number | null | undefined): string {
  if (ms === undefined || ms === null || Number.isNaN(ms)) {
    return "—";
  }
  return format(new Date(ms), "MMM d, yyyy");
}

const mockPositions: PositionRow[] = [
  {
    averagePurchasePrice: 162.5,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "pos-1",
    openPnl: 375.2,
    price: 189.3,
    symbol: "AAPL",
    symbolDescription: "Apple Inc.",
    units: 14,
  },
  {
    averagePurchasePrice: 310,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "pos-2",
    openPnl: 550.8,
    price: 378.85,
    symbol: "MSFT",
    symbolDescription: "Microsoft Corporation",
    units: 8,
  },
  {
    averagePurchasePrice: 480,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "pos-3",
    openPnl: 1977,
    price: 875.4,
    symbol: "NVDA",
    symbolDescription: "NVIDIA Corporation",
    units: 5,
  },
  {
    averagePurchasePrice: 140,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "pos-4",
    openPnl: 427.5,
    price: 182.75,
    symbol: "AMZN",
    symbolDescription: "Amazon.com Inc.",
    units: 10,
  },
  {
    averagePurchasePrice: 128.4,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "pos-5",
    openPnl: 462.3,
    price: 165.22,
    symbol: "GOOGL",
    symbolDescription: "Alphabet Inc. Class A",
    units: 12,
  },
  {
    averagePurchasePrice: 240.1,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "pos-6",
    openPnl: -312.8,
    price: 203.15,
    symbol: "TSLA",
    symbolDescription: "Tesla, Inc.",
    units: 8,
  },
  {
    averagePurchasePrice: 320,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "pos-7",
    openPnl: 890.4,
    price: 487.96,
    symbol: "META",
    symbolDescription: "Meta Platforms, Inc.",
    units: 5,
  },
  {
    averagePurchasePrice: 415,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "pos-8",
    openPnl: 184.2,
    price: 446.05,
    symbol: "VOO",
    symbolDescription: "Vanguard S&P 500 ETF",
    units: 6,
  },
  {
    averagePurchasePrice: 218.45,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "pos-9",
    openPnl: 208.8,
    price: 244.05,
    symbol: "QQQ",
    symbolDescription: "Invesco QQQ Trust",
    units: 8,
  },
  {
    averagePurchasePrice: 62.1,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "pos-10",
    openPnl: -44.4,
    price: 57.67,
    symbol: "F",
    symbolDescription: "Ford Motor Company",
    units: 10,
  },
  {
    averagePurchasePrice: 385.5,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "pos-11",
    openPnl: 615,
    price: 488.5,
    symbol: "COST",
    symbolDescription: "Costco Wholesale Corp.",
    units: 6,
  },
];

const mockActivities: ActivityRow[] = [
  {
    amount: 875.4,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "act-1",
    symbolTicker: "NVDA",
    tradeDate: new Date("2026-04-03").getTime(),
    type: "Buy",
  },
  {
    amount: 2340,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "act-2",
    symbolTicker: "TSLA",
    tradeDate: new Date("2026-04-01").getTime(),
    type: "Sell",
  },
  {
    amount: 189.3,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "act-3",
    symbolTicker: "AAPL",
    tradeDate: new Date("2026-03-28").getTime(),
    type: "Buy",
  },
  {
    amount: 412.36,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "act-4",
    symbolTicker: "MSFT",
    tradeDate: new Date("2026-03-25").getTime(),
    type: "Buy",
  },
  {
    amount: 52.14,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "act-5",
    symbolTicker: "VOO",
    tradeDate: new Date("2026-03-20").getTime(),
    type: "Dividend",
  },
  {
    amount: 1200,
    brokerageAccount: { name: "Robinhood Brokerage" },
    id: "act-6",
    symbolTicker: "GOOGL",
    tradeDate: new Date("2026-03-18").getTime(),
    type: "Buy",
  },
  {
    amount: 312.5,
    brokerageAccount: { name: "Fidelity Investments" },
    id: "act-7",
    symbolTicker: "AMZN",
    tradeDate: new Date("2026-03-15").getTime(),
    type: "Buy",
  },
];

const mockChartData = [
  { display: "1", v: 48_200 },
  { display: "2", v: 42_000 },
  { display: "3", v: 28_600 },
  { display: "4", v: 11_200 },
  { display: "5", v: 9800 },
  { display: "6", v: 13_400 },
  { display: "7", v: 10_500 },
  { display: "8", v: 22_800 },
  { display: "9", v: 35_600 },
  { display: "10", v: 31_200 },
  { display: "11", v: 43_900 },
  { display: "12", v: 46_700 },
  { display: "13", v: 48_293 },
];

const mockScopeAccounts: ScopeAccount[] = [
  {
    displayName: "Fidelity Brokerage · ···9934",
    id: "brok-1",
    institutionName: "Fidelity",
  },
  {
    displayName: "Robinhood Brokerage · ···8821",
    id: "brok-2",
    institutionName: "Robinhood",
  },
];

interface BabyBrokerageProps {
  positions?: PositionRow[];
  activities?: ActivityRow[];
}

export function BabyBrokerage({
  positions = mockPositions,
  activities = mockActivities,
}: BabyBrokerageProps) {
  const [balanceChartRange, setBalanceChartRange] =
    useState<BalanceChartRange>("1M");
  const [brokerageScope, setBrokerageScope] = useState<BrokerageScope>({
    type: "all",
  });

  return (
    <div className="w-full min-w-0 space-y-4 px-4 py-2 sm:py-3">
      <div className="grid w-full items-start gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Portfolio value card */}
        <CobaltCard className="flex w-full min-h-0 flex-col gap-0 rounded-3xl py-0 h-[360px]">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-0">
            <div className="shrink-0 flex w-full items-center justify-between px-5 pt-4">
              <p className="text-left text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                $48,293.64
              </p>
              <BrokerageScopePicker
                accounts={mockScopeAccounts}
                className="[&_button]:h-7 [&_button]:text-xs [&_button]:px-2"
                onScopeChange={setBrokerageScope}
                scope={brokerageScope}
              />
            </div>
            <div className="min-h-0 w-full flex-1 [&_.recharts-tooltip-cursor]:stroke-border/40">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart
                  data={mockChartData}
                  margin={{ bottom: 0, left: 0, right: 0, top: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="brokerageBalanceFill"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--color-green-550)"
                        stopOpacity={0.35}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--color-green-550)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="display" hide />
                  <YAxis axisLine={false} hide tickLine={false} />
                  <Area
                    dataKey="v"
                    fill="url(#brokerageBalanceFill)"
                    stroke="var(--color-green-550)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div
              aria-label="Chart time range"
              className="flex min-h-8 shrink-0 flex-wrap items-center justify-center gap-1 px-5 pb-4"
              role="toolbar"
            >
              {BALANCE_CHART_RANGE_OPTIONS.map((t) => {
                const selected = balanceChartRange === t;
                return (
                  <Button
                    aria-pressed={selected}
                    className="h-8 min-w-8 shrink-0 px-2 text-xs font-medium tabular-nums"
                    key={t}
                    onClick={() => setBalanceChartRange(t)}
                    size="sm"
                    type="button"
                    variant={selected ? "outline" : "ghost"}
                  >
                    {t}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </CobaltCard>

        {/* Recent activity card */}
        <CobaltCard className="flex flex-col gap-0 rounded-3xl py-0 h-[360px] overflow-hidden">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2 px-5 py-4 text-left">
            <div className="shrink-0">
              <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                Recent activity
              </p>
            </div>
            <ul className="flex-1">
              {activities.map((act) => (
                <li
                  key={act.id}
                  className="flex gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <TickerLogo size={36} symbol={act.symbolTicker ?? "—"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground truncate text-sm font-medium text-left">
                      {act.symbolTicker ?? "—"}
                    </p>
                    <p className="text-muted-foreground/70 truncate text-xs text-left">
                      {(act.type ?? "Activity") +
                        (act.brokerageAccount?.name
                          ? ` · ${act.brokerageAccount.name}`
                          : "")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-foreground text-sm font-medium tabular-nums">
                      {act.amount === undefined || act.amount === null
                        ? "—"
                        : money(act.amount)}
                    </p>
                    <p className="text-muted-foreground text-[11px] tabular-nums">
                      {formatEpochDate(act.tradeDate)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </CobaltCard>
      </div>

      {/* Positions table */}
      <CobaltCard className="gap-0 overflow-hidden rounded-3xl py-0">
        <CardContent className="px-5 pt-3 pb-4">
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground text-[11px] tracking-wide uppercase">
                  <th className="py-1.5 pr-2 pl-0 text-left font-medium">
                    Position
                  </th>
                  <th className="px-2 py-1.5 font-medium">Qty</th>
                  <th className="px-2 py-1.5 font-medium">Avg cost</th>
                  <th className="px-2 py-1.5 font-medium">Last price</th>
                  <th className="px-2 py-1.5 font-medium">Value</th>
                  <th className="px-2 py-1.5 font-medium">Open P&amp;L</th>
                  <th className="py-1.5 pr-0 pl-2 text-right font-medium">
                    Account
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-muted/20">
                    <td className="py-2 pr-2 pl-0">
                      <div className="flex items-center gap-3">
                        <TickerLogo size={40} symbol={pos.symbol ?? "—"} />
                        <div className="min-w-0">
                          <p className="text-foreground font-medium">
                            {pos.symbol ?? "—"}
                          </p>
                          {pos.symbolDescription ? (
                            <p className="text-muted-foreground truncate text-xs">
                              {pos.symbolDescription}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground px-2 py-2 tabular-nums">
                      {pos.units === undefined || pos.units === null
                        ? "—"
                        : pos.units.toLocaleString()}
                    </td>
                    <td className="text-muted-foreground px-2 py-2 tabular-nums">
                      {pos.averagePurchasePrice === undefined ||
                      pos.averagePurchasePrice === null
                        ? "—"
                        : money(pos.averagePurchasePrice)}
                    </td>
                    <td className="text-muted-foreground px-2 py-2 tabular-nums">
                      {pos.price === undefined || pos.price === null
                        ? "—"
                        : money(pos.price)}
                    </td>
                    <td className="text-foreground px-2 py-2 font-medium tabular-nums">
                      {pos.units === undefined ||
                      pos.units === null ||
                      pos.price === undefined ||
                      pos.price === null
                        ? "—"
                        : money(pos.units * pos.price)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2 tabular-nums",
                        openPnlToneClass(pos.openPnl)
                      )}
                    >
                      {pos.openPnl === undefined || pos.openPnl === null
                        ? "—"
                        : money(pos.openPnl)}
                    </td>
                    <td className="text-muted-foreground max-w-[12rem] truncate py-2 pr-0 pl-2 text-right text-xs">
                      {pos.brokerageAccount?.name?.trim() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </CobaltCard>
    </div>
  );
}
