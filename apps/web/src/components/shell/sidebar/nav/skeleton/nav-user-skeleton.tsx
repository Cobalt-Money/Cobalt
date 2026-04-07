import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import { Skeleton } from "@cobalt-web/ui/components/skeleton";

/** Matches {@link NavUser} layout while session user is not yet available. */
export function NavUserSkeleton() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="pointer-events-none"
          disabled
          size="default"
        >
          <Skeleton className="size-5 shrink-0 rounded-md" />
          <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
            <Skeleton className="h-3.5 w-24" />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
