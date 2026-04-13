import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cobalt-web/ui/components/avatar";
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
import {
  MoreVerticalCircle01Icon,
  UserCircle02Icon,
  CreditCardIcon,
  Notification03Icon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/lib/clients/auth-client";
import { deleteActiveZeroReplicaOnLogout } from "@/lib/zero-logout";

import { navUserInitials } from "./lib";
import { SettingsDialog } from "./settings-dialog";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const initials = navUserInitials(user.name, user.email);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<
    "profile" | "appearance" | "notifications" | "billing"
  >("profile");

  const openSettings = (
    section: "profile" | "appearance" | "notifications" | "billing"
  ) => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  const handleLogout = async () => {
    await authClient.signOut();
    await deleteActiveZeroReplicaOnLogout();
    await router.navigate({ to: "/" });
  };

  return (
    <>
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
              <Avatar className="size-5 shrink-0 rounded-md">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-[0.625rem]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-muted-foreground">
                  {user.name}
                </span>
              </div>
              <HugeiconsIcon
                icon={MoreVerticalCircle01Icon}
                strokeWidth={2}
                className="ml-auto size-4"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 shrink-0">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>{initials}</AvatarFallback>
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
                <DropdownMenuItem onClick={() => openSettings("notifications")}>
                  <HugeiconsIcon icon={Notification03Icon} strokeWidth={2} />
                  Notifications
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
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultSection={settingsSection}
      />
    </>
  );
}
