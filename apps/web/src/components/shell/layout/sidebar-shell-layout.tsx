import {
  SidebarInset,
  SidebarProvider,
} from "@cobalt-web/ui/components/sidebar";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { ReactNode } from "react";

import { AmbientInsetProvider } from "@/components/shell/ambient-inset-context";
import { AmbientInsetLayer } from "@/components/shell/ambient-inset-layer";
import {
  SHELL_CONTENT_BOTTOM_PADDING_CLASS,
  SHELL_CONTENT_HORIZONTAL_PADDING_CLASS,
} from "@/components/shell/shell-content-inset";

import { SiteHeader } from "../header/site-header";
import { AppSidebar } from "../sidebar/app-sidebar";

interface SidebarShellLayoutProps {
  children?: ReactNode;
  toolbar?: ReactNode;
  /** No bottom padding on the main scroll area — content can extend to the viewport edge. */
  flushBottom?: boolean;
}

export function SidebarShellLayout({
  children,
  toolbar,
  flushBottom = false,
}: SidebarShellLayoutProps) {
  return (
    <SidebarProvider className="min-h-0 flex-1">
      <AppSidebar />
      <AmbientInsetProvider>
        <SidebarInset className="min-h-0 overflow-hidden">
          <AmbientInsetLayer />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <SiteHeader />
            {toolbar}
            <div
              className={cn(
                "relative flex min-h-0 flex-1 flex-col overflow-auto no-scrollbar",
                SHELL_CONTENT_HORIZONTAL_PADDING_CLASS,
                flushBottom
                  ? "pb-0 lg:pb-0"
                  : SHELL_CONTENT_BOTTOM_PADDING_CLASS
              )}
            >
              {children}
            </div>
          </div>
        </SidebarInset>
      </AmbientInsetProvider>
    </SidebarProvider>
  );
}
