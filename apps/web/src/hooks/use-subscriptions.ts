import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  billingCycle: "monthly" | "yearly";
  billingMonth?: number;
}

export function useSubscriptions() {
  const [rows, result] = useQuery(queries.transactions.recurring());

  const subscriptions = useMemo(
    () =>
      rows
        .filter((row) => row.streamType === "outflow")
        .map((row): Subscription | null => {
          const refDate = row.predictedNextDate ?? row.lastDate;
          if (typeof refDate !== "number") {
            return null;
          }

          const d = new Date(refDate);
          const billingDay = d.getUTCDate();
          const billingCycle = row.frequency === "ANNUALLY" ? "yearly" : "monthly";
          const name = (row.merchantName || row.description).trim();
          if (!name) {
            return null;
          }

          return {
            // Subscriptions filter to outflow streams, so `lastAmount` is
            // negative under canonical sign. Expose as positive magnitude —
            // calendar consumers treat `amount` as "$ spent" / "$ left to pay".
            amount: Math.abs(row.lastAmount),
            billingCycle,
            billingDay,
            id: row.id,
            name,
            ...(billingCycle === "yearly" ? { billingMonth: d.getUTCMonth() } : {}),
          };
        })
        .filter((s): s is Subscription => s !== null),
    [rows],
  );

  return { isComplete: result.type === "complete", subscriptions };
}
