import { TickerLogo } from "@cobalt-web/ui/cobalt/brokerage/ticker-logo";
import { CardContent, Card } from "@cobalt-web/ui/components/card";
import { PrivateAmount } from "@cobalt-web/ui/components/privacy";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useMemo } from "react";

export interface PositionRow {
  id: string;
  /** Unified financialAccount.id — used for scope filtering in the chart. */
  accountId?: string | null;
  symbol?: string | null;
  symbolDescription?: string | null;
  securityTypeDescription?: string | null;
  /** Raw shares; same as `units` — kept for parity with the holding row. */
  quantity?: number | null;
  units?: number | null;
  averagePurchasePrice?: number | null;
  price?: number | null;
  openPnl?: number | null;
  /** Plaid populates this directly; SnapTrade leaves it null. */
  institutionValue?: number | null;
  currencyCode?: string | null;
  lastSync?: number | null;
  brokerageAccount?: { id: string; name?: string | null } | null;
}

function money(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amount);
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

function PositionTableRow({ p }: { p: PositionRow }) {
  const sym = positionSymbol(p);
  const sub = p.symbolDescription?.trim() ?? p.securityTypeDescription?.trim() ?? null;
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
            {sub ? <p className="text-muted-foreground truncate text-xs">{sub}</p> : null}
          </div>
        </div>
      </td>
      <td className="text-muted-foreground px-2 py-2 tabular-nums">
        {p.units === undefined || p.units === null ? (
          "—"
        ) : (
          <PrivateAmount>{p.units.toLocaleString()}</PrivateAmount>
        )}
      </td>
      <td className="text-muted-foreground px-2 py-2 tabular-nums">
        {p.averagePurchasePrice === undefined || p.averagePurchasePrice === null ? (
          "—"
        ) : (
          <PrivateAmount>{money(p.averagePurchasePrice)}</PrivateAmount>
        )}
      </td>
      <td className="text-muted-foreground px-2 py-2 tabular-nums">
        {p.price === undefined || p.price === null ? (
          "—"
        ) : (
          <PrivateAmount>{money(p.price)}</PrivateAmount>
        )}
      </td>
      <td className="text-foreground px-2 py-2 font-medium tabular-nums">
        {mkt === null ? "—" : <PrivateAmount>{money(mkt)}</PrivateAmount>}
      </td>
      <td className={cn("px-2 py-2 tabular-nums", openPnlToneClass(p.openPnl))}>
        {p.openPnl === undefined || p.openPnl === null ? (
          "—"
        ) : (
          <PrivateAmount>{money(p.openPnl)}</PrivateAmount>
        )}
      </td>
      <td className="text-muted-foreground max-w-[12rem] truncate py-2 pr-0 pl-2 text-right text-xs">
        {p.brokerageAccount?.name?.trim() ?? "—"}
      </td>
    </tr>
  );
}

export function PositionsTable({
  scopedPositions,
  allPositions,
}: {
  scopedPositions: readonly PositionRow[];
  allPositions: readonly PositionRow[];
}) {
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
    [scopedPositions],
  );

  return (
    <Card variant="subtle" className="gap-0 overflow-hidden rounded-3xl py-0">
      <CardContent className="px-5 pt-3 pb-4">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="text-muted-foreground text-[11px] tracking-wide uppercase">
                <th className="py-1.5 pr-2 pl-0 text-left font-medium">Position</th>
                <th className="px-2 py-1.5 font-medium">Qty</th>
                <th className="px-2 py-1.5 font-medium">Avg cost</th>
                <th className="px-2 py-1.5 font-medium">Last price</th>
                <th className="px-2 py-1.5 font-medium">Value</th>
                <th className="px-2 py-1.5 font-medium">Open P&amp;L</th>
                <th className="py-1.5 pr-0 pl-2 text-right font-medium">Account</th>
              </tr>
            </thead>
            <tbody>
              {scopedPositions.length === 0 ? (
                <tr>
                  <td className="text-muted-foreground py-10 text-center" colSpan={7}>
                    {allPositions.length === 0
                      ? "No holdings in your portfolio"
                      : "No holdings for selected accounts"}
                  </td>
                </tr>
              ) : (
                positionsByValue.map((p) => <PositionTableRow key={p.id} p={p} />)
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
