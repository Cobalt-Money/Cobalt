import {
  SidebarInset,
  SidebarProvider,
} from "@cobalt-web/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "./site-header";

export function SidebarShellLayout({ children }: { children?: ReactNode }) {
  return (
    <SidebarProvider className="min-h-0 flex-1">
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">
        <SiteHeader />
        <div className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
