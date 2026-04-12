import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";
import { useMemo } from "react";

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  billingCycle: "monthly" | "yearly";
  /** 0 = Jan … 11 = Dec — only for yearly billing. */
  billingMonth?: number;
}

/** Typed shape for the fields we read off a Zero recurringStream row. */
interface RecurringStreamRow {
  id: string;
  streamType: string;
  merchantName: string | null | undefined;
  description: string;
  lastAmount: number;
  frequency: string;
  predictedNextDate: string | null | undefined;
  lastDate: string;
}

export function useSubscriptions() {
  const [rows, result] = useQuery(queries.transactions.recurring());

  const subscriptions = useMemo(
    () =>
      (rows as readonly RecurringStreamRow[])
        .filter((row) => row.streamType === "outflow")
        .map((row): Subscription | null => {
          const refDate = row.predictedNextDate ?? row.lastDate;
          if (!refDate) {
            return null;
          }

          const d = new Date(`${refDate}T00:00:00.000Z`);
          const billingDay = d.getUTCDate();
          const billingCycle =
            row.frequency === "ANNUALLY" ? "yearly" : "monthly";
          const name = (row.merchantName || row.description).trim();
          if (!name) {
            return null;
          }

          return {
            amount: row.lastAmount,
            billingCycle,
            billingDay,
            id: row.id,
            name,
            ...(billingCycle === "yearly"
              ? { billingMonth: d.getUTCMonth() }
              : {}),
          };
        })
        .filter((s): s is Subscription => s !== null),
    [rows]
  );

  return { isComplete: result.type === "complete", subscriptions };
}
