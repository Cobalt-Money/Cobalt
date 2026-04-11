import { createFileRoute } from "@tanstack/react-router";

import { DashboardInvestmentPerformanceCard } from "@/components/dashboard/dashboard-investment-performance-card";
import { DashboardRecentTransactionsCard } from "@/components/dashboard/dashboard-recent-transactions-card";
import { DashboardSubscriptionsCalendar } from "@/components/dashboard/dashboard-subscriptions-calendar";
import { NetWorthSection } from "@/components/dashboard/net-worth-section";
import { SidebarShellLayout } from "@/components/shell/layout/sidebar-shell-layout";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
  staticData: { title: "Dashboard" },
});

function DashboardPage() {
  return (
    <SidebarShellLayout>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 py-2 sm:gap-5 sm:py-3">
        <NetWorthSection />
        <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <DashboardRecentTransactionsCard />
          <div className="flex h-full min-w-0 justify-center">
            <DashboardSubscriptionsCalendar />
          </div>
          <DashboardInvestmentPerformanceCard />
        </div>
      </div>
    </SidebarShellLayout>
  );
}
