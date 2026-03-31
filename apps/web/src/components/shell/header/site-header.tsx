import { Button } from "@cobalt-web/ui/components/button";
import { SidebarTrigger } from "@cobalt-web/ui/components/sidebar";
import { BellDotIcon, EyeIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { SiteHeaderPrimaryTitle } from "../site-header-primary-title";

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full min-w-0 items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <SiteHeaderPrimaryTitle />
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            aria-label="Visibility"
            className="text-muted-foreground"
            size="icon"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={EyeIcon} strokeWidth={2} />
          </Button>
          <Button
            aria-label="Notifications"
            className="text-muted-foreground"
            size="icon"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon icon={BellDotIcon} strokeWidth={2} />
          </Button>
        </div>
      </div>
    </header>
  );
}
