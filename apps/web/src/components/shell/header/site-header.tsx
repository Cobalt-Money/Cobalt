import { Button } from "@cobalt-web/ui/components/button";
import { usePrivacy } from "@cobalt-web/ui/hooks/use-privacy";
import { useSidebar } from "@cobalt-web/ui/components/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@cobalt-web/ui/components/tooltip";
import {
  BellDotIcon,
  EyeIcon,
  SearchIcon,
  SidebarLeftIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { NotificationsSheet } from "@/components/alerts/notifications-sheet";
import { CommandMenuSearchShortcut, useCommandMenu } from "@/components/shell/command-menu";
import { useUserAlerts } from "@/hooks/use-user-alerts";

import { SiteHeaderPrimaryTitle } from "../site-header-primary-title";

export function SiteHeader() {
  const { setOpen } = useCommandMenu();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { alerts } = useUserAlerts();
  const hasAlerts = alerts.length > 0;
  const { hidden: privacyHidden, toggle: togglePrivacy } = usePrivacy();
  const { toggleSidebar, state: sidebarState } = useSidebar();

  return (
    <header className="flex h-(--header-height) shrink-0 items-stretch overflow-visible transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex h-full min-h-0 w-full min-w-0 items-center gap-2 px-4 py-2 lg:gap-3 lg:px-6">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                aria-label="Toggle Sidebar"
                className="-ml-1 shrink-0 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={toggleSidebar}
                type="button"
              >
                <HugeiconsIcon
                  aria-hidden
                  className="size-5 sm:size-6"
                  icon={SidebarLeftIcon}
                  strokeWidth={2}
                />
              </button>
            }
          />
          <TooltipContent>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5">
                <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/60 bg-muted/40 px-1.5 font-sans font-medium text-[0.7rem] text-foreground/90 shadow-sm">
                  ⌘
                </kbd>
                <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/60 bg-muted/40 px-1.5 font-sans font-medium text-[0.7rem] text-foreground/90 shadow-sm">
                  B
                </kbd>
              </span>
              <span>to {sidebarState === "expanded" ? "collapse" : "expand"} sidebar</span>
            </span>
          </TooltipContent>
        </Tooltip>
        <SiteHeaderPrimaryTitle />
        <button
          type="button"
          className="flex h-9 min-w-0 max-w-[15rem] flex-1 items-center gap-2 rounded-2xl bg-input/30 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-input/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Open command palette"
        >
          <HugeiconsIcon
            aria-hidden
            className="size-5 shrink-0 opacity-50"
            icon={SearchIcon}
            strokeWidth={2}
          />
          <span className="min-w-0 flex-1 truncate">Search…</span>
          <CommandMenuSearchShortcut />
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <Button
            aria-label={privacyHidden ? "Show amounts" : "Hide amounts"}
            aria-pressed={privacyHidden}
            className="text-muted-foreground"
            onClick={togglePrivacy}
            size="icon"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon
              className="size-5"
              icon={privacyHidden ? ViewOffSlashIcon : EyeIcon}
              strokeWidth={2}
            />
          </Button>
          <Button
            aria-label={
              hasAlerts ? `Notifications (${alerts.length} need attention)` : "Notifications"
            }
            className="relative text-muted-foreground"
            onClick={() => setNotificationsOpen(true)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon className="size-5" icon={BellDotIcon} strokeWidth={2} />
            {hasAlerts ? (
              <span
                aria-hidden
                className="-translate-y-1/4 absolute top-2 right-2 size-1.5 translate-x-1/4 rounded-full bg-destructive ring-2 ring-background"
              />
            ) : null}
          </Button>
        </div>
      </div>
      <NotificationsSheet onOpenChange={setNotificationsOpen} open={notificationsOpen} />
    </header>
  );
}
