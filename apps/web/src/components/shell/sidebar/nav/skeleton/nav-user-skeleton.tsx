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
        <SidebarMenuButton className="pointer-events-none" disabled size="lg">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="grid min-w-0 flex-1 gap-1.5 text-left">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
