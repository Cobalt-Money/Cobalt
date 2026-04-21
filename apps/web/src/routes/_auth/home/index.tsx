import { queries } from "@cobalt-web/zero";
import { createFileRoute } from "@tanstack/react-router";

import { DashboardInvestmentPerformanceCard } from "@/components/dashboard/dashboard-investment-performance-card";
import { DashboardRecentTransactionsCard } from "@/components/dashboard/dashboard-recent-transactions-card";
import { DashboardSubscriptionsCalendar } from "@/components/dashboard/dashboard-subscriptions-calendar";
import { NetWorthSection } from "@/components/dashboard/net-worth-section";

export const Route = createFileRoute("/_auth/home/")({
  component: HomePage,
  loader: ({ context }) => {
    context.zero.run(queries.accounts.bankAccounts());
    context.zero.run(queries.accounts.brokerageAccounts());
    context.zero.run(queries.accounts.bankBalanceSnapshots());
    context.zero.run(queries.brokerage.portfolioSnapshots());
    context.zero.run(queries.transactions.list());
    context.zero.run(queries.transactions.recurring());
    context.zero.run(queries.brokerage.accounts());
    context.zero.run(queries.brokerage.positions());
    context.zero.run(queries.brokerage.recentActivities());
    context.zero.run(queries.brokerage.plaidInvestmentAccounts());
    context.zero.run(queries.brokerage.plaidPositions());
    context.zero.run(queries.brokerage.plaidActivities());
  },
  staticData: { title: "Home" },
});

function HomePage() {
  return (
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
  );
}
