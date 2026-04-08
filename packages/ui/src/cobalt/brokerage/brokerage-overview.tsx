import { cn } from "@cobalt-web/ui/lib/utils";
import { format } from "date-fns";
import type { ReactNode } from "react";

import type { BrokerageRowWithRelations } from "../accounts/lib/map-zero-to-account-cards";
import { brokerageRowToCard } from "../accounts/lib/map-zero-to-account-cards";
import { InstitutionLogo } from "../logos/institution-logo";

/** Narrow shapes for display — Zero `Row<>` uses `unknown` on some columns. */
interface BrokerageBalanceRow {
  cash?: number | null;
  currencyCode?: string | null;
}

interface PositionRow {
  id: string;
  symbol?: string | null;
  units?: number | null;
  averagePurchasePrice?: number | null;
  brokerageAccount?: { id: string; name?: string | null } | null;
}

interface ActivityRow {
  id: string;
  type?: string | null;
  symbol?: unknown;
  symbolTicker?: string | null;
  amount?: number | null;
  tradeDate?: number | null;
  brokerageAccount?: { id: string; name?: string | null } | null;
}

interface OrderRow {
  id: string;
  symbol?: string | null;
  action?: string | null;
  status?: string | null;
  timePlaced?: number | null;
}

const money = (amount: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);

function formatCashBalances(
  balances: readonly BrokerageBalanceRow[] | undefined
) {
  if (!balances?.length) {
    return "—";
  }
  const lines = balances
    .filter((b) => b.cash !== undefined && b.cash !== null)
    .map((b) => money(b.cash ?? 0, b.currencyCode ?? "USD"));
  return lines.length > 0 ? lines.join(" · ") : "—";
}

function formatEpochDate(ms: number | null | undefined) {
  if (ms === undefined || ms === null || Number.isNaN(ms)) {
    return "—";
  }
  return format(new Date(ms), "MMM d, yyyy");
}

function formatDateTime(ms: number | null | undefined) {
  if (ms === undefined || ms === null || Number.isNaN(ms)) {
    return "—";
  }
  return format(new Date(ms), "MMM d, h:mm a");
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

const sectionLabel =
  "text-muted-foreground mb-3 text-[11px] font-medium tracking-[0.08em] uppercase";

function SectionFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/40 px-4 py-4 sm:px-5 sm:py-5",
        className
      )}
    >
      {children}
    </section>
  );
}

export function BrokerageOverview({
  accounts,
  positions,
  recentActivities,
  recentOrders,
}: {
  accounts: readonly BrokerageRowWithRelations[];
  positions: readonly PositionRow[];
  recentActivities: readonly ActivityRow[];
  recentOrders: readonly OrderRow[];
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-1 py-2">
      <header className="space-y-1">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Brokerage
        </h1>
        <p className="text-muted-foreground text-sm">
          {accounts.length} account{accounts.length === 1 ? "" : "s"} ·{" "}
          {positions.length} position{positions.length === 1 ? "" : "s"}
        </p>
      </header>

      <div>
        <h2 className={sectionLabel}>Accounts</h2>
        <SectionFrame className="divide-y divide-border/50 p-0">
          {accounts.map((row) => {
            const card = brokerageRowToCard(row);
            return (
              <div
                key={row.id}
                className="flex items-start gap-3 px-4 py-4 sm:px-5 sm:py-4"
              >
                <InstitutionLogo
                  className="size-9 shrink-0 sm:size-10"
                  institutionLogo={card.institutionLogo}
                  institutionLogosExtra={
                    card.institutionLogosExtra ?? undefined
                  }
                  institutionName={card.institution}
                  institutionUrl={card.institutionUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate text-sm font-medium">
                    {card.description}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {card.institution} · {card.accountTypeLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-foreground text-sm font-medium tabular-nums">
                    {formatCashBalances(
                      row.balances as BrokerageBalanceRow[] | undefined
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </SectionFrame>
      </div>

      <div>
        <h2 className={sectionLabel}>Holdings</h2>
        <SectionFrame className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground border-b border-border/60 text-[11px] tracking-wide uppercase">
                  <th className="px-4 py-2.5 font-medium">Symbol</th>
                  <th className="px-2 py-2.5 font-medium">Qty</th>
                  <th className="px-2 py-2.5 font-medium">Avg cost</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Account
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {positions.map((p) => (
                  <tr key={p.id} className="text-foreground">
                    <td className="px-4 py-3 font-medium tabular-nums">
                      {p.symbol?.trim() || "—"}
                    </td>
                    <td className="text-muted-foreground px-2 py-3 tabular-nums">
                      {p.units === undefined || p.units === null
                        ? "—"
                        : p.units.toLocaleString()}
                    </td>
                    <td className="text-muted-foreground px-2 py-3 tabular-nums">
                      {p.averagePurchasePrice === undefined ||
                      p.averagePurchasePrice === null
                        ? "—"
                        : money(p.averagePurchasePrice)}
                    </td>
                    <td className="text-muted-foreground max-w-[10rem] truncate px-4 py-3 text-right text-xs">
                      {p.brokerageAccount?.name?.trim() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionFrame>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className={sectionLabel}>Recent activity</h2>
          <SectionFrame className="p-0">
            <ul className="divide-y divide-border/40">
              {recentActivities.map((a) => (
                <li
                  key={a.id}
                  className="flex items-baseline justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">
                      {activitySymbolLabel(a)}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {(a.type ?? "Activity") +
                        (a.brokerageAccount?.name
                          ? ` · ${a.brokerageAccount.name}`
                          : "")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-foreground text-sm tabular-nums">
                      {a.amount === undefined || a.amount === null
                        ? "—"
                        : money(a.amount)}
                    </p>
                    <p className="text-muted-foreground text-[11px] tabular-nums">
                      {formatEpochDate(a.tradeDate)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionFrame>
        </div>

        <div>
          <h2 className={sectionLabel}>Orders</h2>
          <SectionFrame className="p-0">
            <ul className="divide-y divide-border/40">
              {recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-baseline justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-medium">
                      {o.symbol?.trim() || "—"}
                    </p>
                    <p className="text-muted-foreground truncate text-xs capitalize">
                      {(o.action ?? "Order").toLowerCase()}
                      {o.status ? ` · ${o.status}` : ""}
                    </p>
                  </div>
                  <p className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                    {formatDateTime(o.timePlaced)}
                  </p>
                </li>
              ))}
            </ul>
          </SectionFrame>
        </div>
      </div>
    </div>
  );
}
