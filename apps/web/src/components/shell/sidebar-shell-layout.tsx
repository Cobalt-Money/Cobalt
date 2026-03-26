import {
  SidebarInset,
  SidebarProvider,
} from "@cobalt-web/ui/components/sidebar";
import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "./site-header";

export function SidebarShellLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="relative flex flex-1 flex-col gap-6 overflow-auto p-4 lg:p-6">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
