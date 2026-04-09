import { Button } from "@cobalt-web/ui/components/button";
// import { SidebarTrigger } from "@cobalt-web/ui/components/sidebar";
import { BellDotIcon, EyeIcon, SearchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  CommandMenuSearchShortcut,
  useCommandMenu,
} from "@/components/shell/command-menu";

import { SiteHeaderPrimaryTitle } from "../site-header-primary-title";

export function SiteHeader() {
  const { setOpen } = useCommandMenu();

  return (
    <header className="flex h-(--header-height) shrink-0 items-stretch transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex h-full min-h-0 w-full min-w-0 items-center gap-2 px-4 lg:gap-3 lg:px-6">
        {/* Sidebar toggle disabled for now — restore: <SidebarTrigger className="-ml-1" /> */}
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
            aria-label="Visibility"
            className="text-muted-foreground"
            size="icon"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon className="size-5" icon={EyeIcon} strokeWidth={2} />
          </Button>
          <Button
            aria-label="Notifications"
            className="text-muted-foreground"
            size="icon"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon
              className="size-5"
              icon={BellDotIcon}
              strokeWidth={2}
            />
          </Button>
        </div>
      </div>
    </header>
  );
}
