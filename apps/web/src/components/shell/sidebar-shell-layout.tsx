import {
  SidebarInset,
  SidebarProvider,
} from "@cobalt-web/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "./site-header";

export function SidebarShellLayout({ children }: { children?: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="relative flex flex-1 flex-col overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
