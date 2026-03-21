import { queries } from "@cobalt-web/zero";
import type { Zero } from "@rocicorp/zero";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { ZeroNeedsAuthBanner } from "@/components/zero-needs-auth-banner";
import { getUser } from "@/functions/get-user";
import { ZeroProvider } from "@/lib/zero-client";

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
 * Preloads transaction query shapes when the `Zero` client is created — same
 * pattern as ztunes (`ZeroProvider` `init`), not `useEffect` in a child.
 *
 * @see https://github.com/rocicorp/ztunes/blob/main/app/components/zero-init.tsx
 */
function preloadTransactionsQueries(z: Zero) {
  z.preload(queries.transactions.list());
  z.preload(queries.transactions.recurring());
  for (const period of CREDIT_SPENDING_PERIODS) {
    z.preload(queries.transactions.creditSpending({ period }));
  }
}

function TransactionsShell() {
  return (
    <ZeroProvider init={preloadTransactionsQueries}>
      <div className="container mx-auto max-w-4xl px-4 py-4">
        <ZeroNeedsAuthBanner />
        <p className="text-muted-foreground mb-3 text-sm">
          Each view uses Zero&apos;s{" "}
          <code className="text-foreground">useQuery</code> — reactive reads
          from the local replica. This layout also{" "}
          <code className="text-foreground">preload</code>s list, recurring, and
          every credit period (1w–all) so tab switches and the period dropdown
          stay snappy.
        </p>
        <Outlet />
      </div>
    </ZeroProvider>
  );
}
