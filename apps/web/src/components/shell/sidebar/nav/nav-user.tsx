import { Avatar, AvatarFallback, AvatarImage } from "@cobalt-web/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@cobalt-web/ui/components/sidebar";
import { UserCircle02Icon, CreditCardIcon, Logout01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";

import { logout } from "@/lib/zero-logout";

import { navUserInitials } from "./lib";
import { useSettingsDialog } from "./settings-dialog-provider";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    /** Demo session: render a gradient blob instead of initials, matching the landing-page MiniSidebar. */
    isAnonymous?: boolean;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const initials = navUserInitials(user.name, user.email);
  const { openSettings } = useSettingsDialog();
  const anonAvatar = (
    <div
      aria-label="Demo user"
      className="size-full rounded-md bg-gradient-to-br from-blue-400 to-violet-500"
    />
  );

  const handleLogout = async () => {
    await logout();
    await router.navigate({ to: "/" });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="px-2 text-muted-foreground aria-expanded:bg-muted"
                size="default"
              />
            }
          >
            <Avatar className="size-7 shrink-0 rounded-md">
              {user.isAnonymous ? (
                anonAvatar
              ) : (
                <>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </>
              )}
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium text-base text-muted-foreground">
                {user.name}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-3xl border border-border bg-popover p-1 shadow-xs ring-0 dark:bg-sidebar-accent"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 shrink-0">
                    {user.isAnonymous ? (
                      anonAvatar
                    ) : (
                      <>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openSettings("profile")}>
                <HugeiconsIcon icon={UserCircle02Icon} strokeWidth={2} />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSettings("billing")}>
                <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />
                Billing
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await handleLogout();
              }}
            >
              <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
