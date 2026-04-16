import { SidebarInset } from "@cobalt-web/ui/components/sidebar";
import { cn } from "@cobalt-web/ui/lib/utils";
import type { ReactNode } from "react";

import { AmbientInsetLayer } from "@/components/shell/ambient-inset-layer";
import {
  SHELL_CONTENT_BOTTOM_PADDING_CLASS,
  SHELL_CONTENT_HORIZONTAL_PADDING_CLASS,
} from "@/components/shell/shell-content-inset";

import { SiteHeader } from "../header/site-header";

interface SidebarShellLayoutProps {
  children?: ReactNode;
  toolbar?: ReactNode;
  /** No bottom padding on the main shell scroll area — content can extend to the viewport edge. */
  flushBottom?: boolean;
  /**
   * Override {@link SidebarInset} surface color. Defaults to shadcn `bg-sidebar-inset`;
   * use `bg-background` when the inset should match body/ambient (e.g. research ticker).
   */
  sidebarInsetClassName?: string;
}

export function SidebarShellLayout({
  children,
  toolbar,
  flushBottom = false,
  sidebarInsetClassName,
}: SidebarShellLayoutProps) {
  return (
    <SidebarInset
      className={cn("min-h-0 overflow-hidden", sidebarInsetClassName)}
    >
      <AmbientInsetLayer />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <SiteHeader />
        {toolbar}
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-auto no-scrollbar",
            SHELL_CONTENT_HORIZONTAL_PADDING_CLASS,
            flushBottom ? "pb-0 lg:pb-0" : SHELL_CONTENT_BOTTOM_PADDING_CLASS
          )}
        >
          {children}
        </div>
      </div>
    </SidebarInset>
  );
}
