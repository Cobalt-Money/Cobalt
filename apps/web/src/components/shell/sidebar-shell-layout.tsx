import {
  SidebarInset,
  SidebarProvider,
} from "@cobalt-web/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "./site-header";

interface SidebarShellLayoutProps {
  children?: ReactNode;
  toolbar?: ReactNode;
}

export function SidebarShellLayout({
  children,
  toolbar,
}: SidebarShellLayoutProps) {
  return (
    <SidebarProvider className="min-h-0 flex-1">
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">
        <SiteHeader />
        {toolbar}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-auto px-4 pb-4 lg:px-6 lg:pb-6 no-scrollbar">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
