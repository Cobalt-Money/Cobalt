import { queries } from "@cobalt-web/zero";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

import { getUser } from "@/functions/get-user";
import { ZeroProvider } from "@/lib/zero-client";
import { useZero } from "@rocicorp/zero/react";

import { CREDIT_SPENDING_PERIODS } from "./credit-periods";

export const Route = createFileRoute("/transactions")({
  beforeLoad: async () => {
    const session = await getUser();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    return { session };
  },
  component: TransactionsShell,
});

/**
 * Registers sync for all three transaction query shapes as soon as you enter
 * `/transactions/*`, so switching tabs can hit data that&apos;s already in the replica.
 */
function TransactionsZeroPreload() {
  const zero = useZero();
  useEffect(() => {
    const list = zero.preload(queries.transactions.list());
    const recurring = zero.preload(queries.transactions.recurring());
    const credits = CREDIT_SPENDING_PERIODS.map((period) =>
      zero.preload(queries.transactions.creditSpending({ period }))
    );
    return () => {
      list.cleanup();
      recurring.cleanup();
      for (const c of credits) {
        c.cleanup();
      }
    };
  }, [zero]);
  return null;
}

function TransactionsShell() {
  return (
    <ZeroProvider>
      <TransactionsZeroPreload />
      <div className="container mx-auto max-w-4xl px-4 py-4">
        <p className="text-muted-foreground mb-3 text-sm">
          Each view uses Zero&apos;s{" "}
          <code className="text-foreground">useQuery</code> — reactive reads
          from the local replica. This layout also{" "}
          <code className="text-foreground">preload</code>s list, recurring,
          and every credit period (1w–all) so tab switches and the period
          dropdown stay snappy.
        </p>
        <Outlet />
      </div>
    </ZeroProvider>
  );
}
