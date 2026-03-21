import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CREDIT_SPENDING_PERIODS } from "./credit-periods";
import type { CreditSpendingPeriod } from "./credit-periods";

export const Route = createFileRoute("/transactions/credit-spending")({
  component: CreditSpendingPage,
});

function formatDay(ms: number): string {
  try {
    return new Date(ms).toISOString().split("T")[0] ?? String(ms);
  } catch {
    return String(ms);
  }
}

function aggregateCreditSpending(
  rows: readonly { amount: number; date: number }[],
  period: CreditSpendingPeriod
) {
  const bucketSizeMap: Record<
    CreditSpendingPeriod,
    "daily" | "weekly" | "monthly"
  > = {
    "1m": "daily",
    "1w": "daily",
    "1y": "monthly",
    "3m": "weekly",
    "6m": "monthly",
    all: "monthly",
  };
  const bucketSize = bucketSizeMap[period] ?? "monthly";
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const d = formatDay(row.date);
    let key: string;
    if (bucketSize === "daily") {
      key = d;
    } else if (bucketSize === "weekly") {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - dt.getDay());
      key = dt.toISOString().split("T")[0] ?? d;
    } else {
      key = d.slice(0, 7);
    }
    buckets.set(key, (buckets.get(key) ?? 0) + Math.abs(row.amount));
  }
  const spending = [...buckets.entries()]
    .map(([date, amount]) => ({ amount, date }))
    .toSorted((a, b) => a.date.localeCompare(b.date));
  const totalSpending = spending.reduce((sum, s) => sum + s.amount, 0);
  return { spending, totalSpending };
}

function CreditSpendingPage() {
  const [period, setPeriod] = useState<CreditSpendingPeriod>("1m");
  const [rows] = useQuery(queries.transactions.creditSpending({ period }));

  const { spending, totalSpending } = useMemo(
    () => aggregateCreditSpending(rows, period),
    [rows, period]
  );

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-medium">Credit spending</h1>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm">Period</span>
        <select
          className="bg-background border rounded px-2 py-1 text-sm"
          onChange={(e) => setPeriod(e.target.value as CreditSpendingPeriod)}
          value={period}
        >
          {CREDIT_SPENDING_PERIODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground text-sm">
          {rows.length} credit tx · total {totalSpending.toFixed(2)}
        </span>
      </div>
      <ul className="font-mono text-xs">
        {spending.map((s) => (
          <li className="border-b py-1" key={s.date}>
            {s.date} · {s.amount.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
