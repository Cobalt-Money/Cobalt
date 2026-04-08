"use client";

import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BrokerageRowWithRelations } from "../accounts/lib/map-zero-to-account-cards";
import { CardContent, CobaltCard } from "../card";
import { BrokerageScopePicker } from "./brokerage-scope-picker";
import type { BrokerageScope } from "./brokerage-scope-picker";
import { TickerLogo } from "./ticker-logo";

interface BrokerageBalanceRow {
  cash?: number | null;
  currencyCode?: string | null;
}

interface PositionRow {
  id: string;
  symbol?: string | null;
  symbolDescription?: string | null;
  securityTypeDescription?: string | null;
  units?: number | null;
  averagePurchasePrice?: number | null;
  price?: number | null;
  openPnl?: number | null;
  currencyCode?: string | null;
  lastSync?: number | null;
  brokerageAccount?: { id: string; name?: string | null } | null;
}

interface ActivityRow {
  id: string;
  type?: string | null;
  symbol?: unknown;
  symbolTicker?: string | null;
  symbolDescription?: string | null;
  amount?: number | null;
  price?: number | null;
  tradeDate?: number | null;
  brokerageAccount?: { id: string; name?: string | null } | null;
}

const money = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

function sumUsdCash(accounts: readonly BrokerageRowWithRelations[]) {
  let total = 0;
  for (const acc of accounts) {
    const bals = acc.balances as BrokerageBalanceRow[] | undefined;
    for (const b of bals ?? []) {
      if (b.cash === undefined || b.cash === null) {
        continue;
      }
      const code = (b.currencyCode ?? "USD").toUpperCase();
      if (code === "USD") {
        total += b.cash;
      }
    }
  }
  return total;
}

function positionNotional(p: PositionRow): number | null {
  if (
    p.units === undefined ||
    p.units === null ||
    p.averagePurchasePrice === undefined ||
    p.averagePurchasePrice === null
  ) {
    return null;
  }
  return p.units * p.averagePurchasePrice;
}

/** Market value: units × last/mark price when available, else cost basis. */
function positionMarketValue(p: PositionRow): number | null {
  if (p.units === undefined || p.units === null) {
    return null;
  }
  if (p.price !== undefined && p.price !== null) {
    return p.units * p.price;
  }
  return positionNotional(p);
}

function positionSymbol(p: PositionRow): string {
  return p.symbol?.trim() || "—";
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

function BrokeragePositionTableRow({ p }: { p: PositionRow }) {
  const sym = positionSymbol(p);
  const sub =
    p.symbolDescription?.trim() ?? p.securityTypeDescription?.trim() ?? null;
  const mkt = positionMarketValue(p);

  return (
    <tr className="hover:bg-muted/20">
      <td className="py-2 pr-2 pl-0">
        <div className="flex items-center gap-3">
          <TickerLogo size={40} symbol={sym} />
          <div className="min-w-0">
            <p className="text-foreground font-medium">
              {sym}
              {p.currencyCode ? (
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  {p.currencyCode}
                </span>
              ) : null}
            </p>
            {sub ? (
              <p className="text-muted-foreground truncate text-xs">{sub}</p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="text-muted-foreground px-2 py-2 tabular-nums">
        {p.units === undefined || p.units === null
          ? "—"
          : p.units.toLocaleString()}
      </td>
      <td className="text-muted-foreground px-2 py-2 tabular-nums">
        {p.averagePurchasePrice === undefined || p.averagePurchasePrice === null
          ? "—"
          : money(p.averagePurchasePrice)}
      </td>
      <td className="text-muted-foreground px-2 py-2 tabular-nums">
        {p.price === undefined || p.price === null ? "—" : money(p.price)}
      </td>
      <td className="text-foreground px-2 py-2 font-medium tabular-nums">
        {mkt === null ? "—" : money(mkt)}
      </td>
      <td className={cn("px-2 py-2 tabular-nums", openPnlToneClass(p.openPnl))}>
        {p.openPnl === undefined || p.openPnl === null ? "—" : money(p.openPnl)}
      </td>
      <td className="text-muted-foreground max-w-[12rem] truncate py-2 pr-0 pl-2 text-right text-xs">
        {p.brokerageAccount?.name?.trim() ?? "—"}
      </td>
    </tr>
  );
}

function investedTotal(positions: readonly PositionRow[]) {
  let s = 0;
  for (const p of positions) {
    const n = positionNotional(p);
    if (n !== null) {
      s += n;
    }
  }
  return s;
}

function formatEpochDate(ms: number | null | undefined) {
  if (ms === undefined || ms === null || Number.isNaN(ms)) {
    return "—";
  }
  return format(new Date(ms), "MMM d, yyyy");
}

const ACTIVITY_PAGE_SIZE = 7;

/** Chart time-range tabs (visual only until range is wired to series data). */
const BALANCE_CHART_RANGE_OPTIONS = [
  "1D",
  "1W",
  "1M",
  "3M",
  "YTD",
  "1Y",
  "5Y",
  "All",
] as const;

type BalanceChartRange = (typeof BALANCE_CHART_RANGE_OPTIONS)[number];

type ActivityPagerEntry =
  | { key: string; kind: "page"; page: number }
  | { key: string; kind: "ellipsis" };

/** Page numbers to show in the activity pager (1-based). */
function activityVisiblePages(
  currentPage: number,
  totalPages: number
): ActivityPagerEntry[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => {
      const page = i + 1;
      return { key: `page-${page}`, kind: "page" as const, page };
    });
  }
  const pages = new Set<number>([
    1,
    totalPages,
    currentPage,
    currentPage - 1,
    currentPage + 1,
  ]);
  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= totalPages)
    .toSorted((a, b) => a - b);
  const out: ActivityPagerEntry[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) {
      out.push({ key: `ellipsis-${prev}-before-${n}`, kind: "ellipsis" });
    }
    out.push({ key: `page-${n}`, kind: "page", page: n });
    prev = n;
  }
  return out;
}

function activitySymbolLabel(a: ActivityRow): string {
  const ticker = a.symbolTicker?.trim();
  if (ticker) {
    return ticker;
  }
  const sym = a.symbol;
  if (typeof sym === "string" && sym.trim()) {
    return sym.trim();
  }
  return "—";
}

export function BrokerageOverview({
  accounts,
  positions,
  recentActivities,
}: {
  accounts: readonly BrokerageRowWithRelations[];
  positions: readonly PositionRow[];
  recentActivities: readonly ActivityRow[];
}) {
  const [activityPageIndex, setActivityPageIndex] = useState(0);
  const [balanceChartRange, setBalanceChartRange] =
    useState<BalanceChartRange>("1D");
  const [brokerageScope, setBrokerageScope] = useState<BrokerageScope>({
    type: "all",
  });

  const scopedAccountIds = useMemo(() => {
    if (brokerageScope.type === "all") {
      return null;
    }
    return new Set(brokerageScope.accountIds);
  }, [brokerageScope]);

  const scopedAccounts = useMemo(() => {
    if (scopedAccountIds === null) {
      return accounts;
    }
    return accounts.filter((a) => scopedAccountIds.has(a.id));
  }, [accounts, scopedAccountIds]);

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
      return recentActivities;
    }
    return recentActivities.filter(
      (a) =>
        a.brokerageAccount?.id !== undefined &&
        a.brokerageAccount?.id !== null &&
        scopedAccountIds.has(a.brokerageAccount.id)
    );
  }, [recentActivities, scopedAccountIds]);

  const activityTotalPages = Math.max(
    1,
    Math.ceil(scopedActivities.length / ACTIVITY_PAGE_SIZE)
  );

  useEffect(() => {
    const maxIdx = activityTotalPages - 1;
    setActivityPageIndex((i) => (i > maxIdx ? maxIdx : i));
  }, [activityTotalPages]);

  const activityPageSlice = useMemo(() => {
    const start = activityPageIndex * ACTIVITY_PAGE_SIZE;
    return scopedActivities.slice(start, start + ACTIVITY_PAGE_SIZE);
  }, [scopedActivities, activityPageIndex]);

  const activityPageNumber = activityPageIndex + 1;
  const activityPagerItems = useMemo(
    () => activityVisiblePages(activityPageNumber, activityTotalPages),
    [activityPageNumber, activityTotalPages]
  );

  const cashTotal = useMemo(() => sumUsdCash(scopedAccounts), [scopedAccounts]);
  const invested = useMemo(
    () => investedTotal(scopedPositions),
    [scopedPositions]
  );
  const netWorth = cashTotal + invested;

  const chartPoints = useMemo(() => {
    const base = Math.max(netWorth, 0);
    return Array.from({ length: 14 }, (_, i) => ({
      label: i,
      v: base * (1 + Math.sin(i / 2.2) * 0.018 + (i % 3) * 0.002),
    }));
  }, [netWorth]);

  /** Largest market value first; rows with unknown value sort last. */
  const positionsByValue = useMemo(
    () =>
      [...scopedPositions].toSorted((a, b) => {
        const va = positionMarketValue(a);
        const vb = positionMarketValue(b);
        if (va === null && vb === null) {
          return 0;
        }
        if (va === null) {
          return 1;
        }
        if (vb === null) {
          return -1;
        }
        return vb - va;
      }),
    [scopedPositions]
  );

  return (
    <div className="w-full min-w-0 space-y-4 py-2 sm:py-3">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <CobaltCard className="flex h-full min-h-0 flex-col gap-0 rounded-3xl py-0 lg:min-h-[400px]">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0 py-4">
            <div className="shrink-0 px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="text-foreground text-2xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                    {money(netWorth)}
                  </p>
                </div>
                {accounts.length > 0 ? (
                  <div className="flex w-full shrink-0 justify-end sm:w-auto">
                    <BrokerageScopePicker
                      accounts={accounts}
                      onScopeChange={setBrokerageScope}
                      scope={brokerageScope}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="min-h-[200px] w-full min-w-0 flex-1 [&_.recharts-tooltip-cursor]:stroke-border/40">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart
                  data={chartPoints}
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
                  <XAxis dataKey="label" hide />
                  <YAxis domain={["auto", "auto"]} hide width={0} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid oklch(0.5 0.02 280 / 0.25)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(v) =>
                      typeof v === "number"
                        ? [money(v), "Balance"]
                        : ["—", "Balance"]
                    }
                    labelStyle={{ display: "none" }}
                  />
                  <Area
                    dataKey="v"
                    fill="url(#brokerageBalanceFill)"
                    isAnimationActive={false}
                    stroke="var(--color-green-550)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div
              aria-label="Chart time range"
              className="flex min-h-8 shrink-0 flex-wrap items-center justify-center gap-1 px-5"
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

        <CobaltCard className="flex h-full min-h-0 flex-col gap-0 rounded-3xl py-0 lg:min-h-[400px]">
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2 px-5 py-4">
            <div className="shrink-0">
              <p className="text-muted-foreground text-[11px] font-medium tracking uppercase">
                Recent activity
              </p>
            </div>
            <ul className="flex-1">
              {scopedActivities.length === 0 ? (
                <li className="text-muted-foreground list-none py-8 text-center text-sm">
                  {recentActivities.length === 0
                    ? "No recent activity"
                    : "No activity for selected accounts"}
                </li>
              ) : (
                activityPageSlice.map((a) => {
                  const sym = activitySymbolLabel(a);
                  return (
                    <li
                      key={a.id}
                      className="flex gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <TickerLogo size={36} symbol={sym} />
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-medium">
                          {sym}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {(a.type ?? "Activity") +
                            (a.brokerageAccount?.name
                              ? ` · ${a.brokerageAccount.name}`
                              : "")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-foreground text-sm font-medium tabular-nums">
                          {a.amount === undefined || a.amount === null
                            ? "—"
                            : money(a.amount)}
                        </p>
                        <p className="text-muted-foreground text-[11px] tabular-nums">
                          {formatEpochDate(a.tradeDate)}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
            {scopedActivities.length > ACTIVITY_PAGE_SIZE ? (
              <nav
                aria-label="Recent activity pages"
                className="flex min-h-8 shrink-0 flex-wrap items-center justify-center gap-1"
              >
                <Button
                  aria-label="Previous page"
                  className="size-8"
                  disabled={activityPageIndex <= 0}
                  onClick={() =>
                    setActivityPageIndex((i) => Math.max(0, i - 1))
                  }
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                </Button>
                {activityPagerItems.map((item) =>
                  item.kind === "ellipsis" ? (
                    <span
                      aria-hidden
                      className="text-muted-foreground flex size-8 items-center justify-center text-xs"
                      key={item.key}
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      aria-current={
                        item.page === activityPageNumber ? "page" : undefined
                      }
                      aria-label={`Page ${item.page}`}
                      className="size-8 min-w-8 px-0 text-xs"
                      key={item.key}
                      onClick={() => setActivityPageIndex(item.page - 1)}
                      size="icon-sm"
                      type="button"
                      variant={
                        item.page === activityPageNumber ? "outline" : "ghost"
                      }
                    >
                      {item.page}
                    </Button>
                  )
                )}
                <Button
                  aria-label="Next page"
                  className="size-8"
                  disabled={activityPageIndex >= activityTotalPages - 1}
                  onClick={() =>
                    setActivityPageIndex((i) =>
                      Math.min(activityTotalPages - 1, i + 1)
                    )
                  }
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                </Button>
              </nav>
            ) : (
              <div aria-hidden className="min-h-8 shrink-0" />
            )}
          </CardContent>
        </CobaltCard>
      </div>

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
                {scopedPositions.length === 0 ? (
                  <tr>
                    <td
                      className="text-muted-foreground py-10 text-center"
                      colSpan={7}
                    >
                      {positions.length === 0
                        ? "No holdings in your portfolio"
                        : "No holdings for selected accounts"}
                    </td>
                  </tr>
                ) : (
                  positionsByValue.map((p) => (
                    <BrokeragePositionTableRow key={p.id} p={p} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </CobaltCard>
    </div>
  );
}
