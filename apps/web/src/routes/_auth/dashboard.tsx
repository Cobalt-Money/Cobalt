import { Button } from "@cobalt-web/ui/components/button";
import { queries } from "@cobalt-web/zero";
import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Zero } from "@rocicorp/zero";
import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardInvestmentPerformanceCard } from "@/components/dashboard/dashboard-investment-performance-card";
import { DashboardRecentTransactionsCard } from "@/components/dashboard/dashboard-recent-transactions-card";
import { DashboardSubscriptionsCalendar } from "@/components/dashboard/dashboard-subscriptions-calendar";
import { NetWorthSection } from "@/components/dashboard/net-worth-section";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";
import { useAccounts } from "@/hooks/use-accounts";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
  loader: ({ context }) => {
    const z = context.zero as unknown as Zero;
    z.run(queries.accounts.bankAccounts());
    z.run(queries.accounts.brokerageAccounts());
  },
  staticData: { title: "Dashboard" },
});

function DashboardEmptyState() {
  return (
    <div className="flex min-h-[min(68vh,560px)] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-16 text-center">
      <div className="bg-muted mb-5 flex size-14 items-center justify-center rounded-2xl">
        <HugeiconsIcon
          className="text-muted-foreground"
          icon={CreditCardIcon}
          size={26}
          strokeWidth={1.5}
        />
      </div>
      <p className="text-foreground text-base font-semibold">
        Your financial overview starts here
      </p>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        Connect your bank and brokerage accounts to see your net worth,
        transactions, subscriptions, and portfolio all in one place.
      </p>
      <Button className="mt-6" render={<Link to="/accounts" />} size="sm">
        Connect accounts
      </Button>
    </div>
  );
}

function DashboardPage() {
  const { isComplete, items } = useAccounts();
  const isEmpty = isComplete && items.length === 0;

  return (
    <SidebarShellLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 py-2 sm:gap-5 sm:py-3">
        {isEmpty ? (
          <DashboardEmptyState />
        ) : (
          <>
            <NetWorthSection />
            <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <DashboardRecentTransactionsCard />
              <div className="flex h-full min-w-0 justify-center">
                <DashboardSubscriptionsCalendar />
              </div>
              <DashboardInvestmentPerformanceCard />
            </div>
          </>
        )}
      </div>
    </SidebarShellLayout>
  );
}
