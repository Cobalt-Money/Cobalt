import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { ZeroNeedsAuthBanner } from "@/components/zero-needs-auth-banner";
import { getUser } from "@/functions/get-user";

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

function TransactionsShell() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-4">
      <ZeroNeedsAuthBanner />
      <p className="text-muted-foreground mb-3 text-sm">
        Each view uses Zero&apos;s{" "}
        <code className="text-foreground">useQuery</code> — reactive reads from
        the local replica. Route <code className="text-foreground">loader</code>
        s call <code className="text-foreground">context.zero.run()</code>{" "}
        (ztunes pattern). The root{" "}
        <code className="text-foreground">ZeroProvider</code>{" "}
        <code className="text-foreground">preload</code>s list, recurring, and
        every credit period (1w–all) so tab switches and the period dropdown
        stay snappy.
      </p>
      <Outlet />
    </div>
  );
}
