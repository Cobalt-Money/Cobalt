import {
  SidebarInset,
  SidebarProvider,
} from "@cobalt-web/ui/components/sidebar";
import { createFileRoute } from "@tanstack/react-router";

import { AppSidebar } from "@/components/shell/app-sidebar";
import { SiteHeader } from "@/components/shell/site-header";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 text-muted-foreground text-sm lg:p-6">
          <p>Main content area — add your layout here.</p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
