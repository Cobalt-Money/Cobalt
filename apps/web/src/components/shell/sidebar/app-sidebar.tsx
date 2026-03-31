import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import {
  BankIcon,
  Book01Icon,
  CubeIcon,
  DashboardSquare01Icon,
  HelpCircleIcon,
  SearchIcon,
  Settings05Icon,
  TransactionHistoryIcon,
  UserAccountIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

import { useAppSession } from "@/lib/providers/app-session";

import { NavMain, NavSecondary } from "./nav/nav-main";
import { NavUser } from "./nav/nav-user";
import { NavUserSkeleton } from "./nav/skeleton/nav-user-skeleton";

const sidebarNav = {
  navMain: [
    {
      icon: <HugeiconsIcon icon={DashboardSquare01Icon} strokeWidth={2} />,
      title: "Dashboard",
      url: "/dashboard",
    },
    {
      icon: <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} />,
      title: "Transactions",
      url: "/transactions",
    },
    {
      icon: <HugeiconsIcon icon={BankIcon} strokeWidth={2} />,
      title: "Brokerage",
      url: "/brokerage",
    },
    {
      icon: <HugeiconsIcon icon={UserAccountIcon} strokeWidth={2} />,
      title: "Accounts",
      url: "/accounts",
    },
    {
      icon: <HugeiconsIcon icon={Book01Icon} strokeWidth={2} />,
      title: "Research",
      url: "/research",
    },
    {
      icon: <HugeiconsIcon icon={CubeIcon} strokeWidth={2} />,
      title: "Logos",
      url: "/logos",
    },
  ],
  navSecondary: [
    {
      icon: <HugeiconsIcon icon={Settings05Icon} strokeWidth={2} />,
      title: "Settings",
      url: "#",
    },
    {
      icon: <HugeiconsIcon icon={HelpCircleIcon} strokeWidth={2} />,
      title: "Get Help",
      url: "#",
    },
    {
      icon: <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />,
      title: "Search",
      url: "#",
    },
  ],
};

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const session = useAppSession();
  const authedUser = session.data?.user;
  const navUser =
    authedUser === undefined
      ? null
      : {
          avatar: authedUser.image ?? "",
          email: authedUser.email ?? "",
          name: authedUser.name,
        };

  return (
    <Sidebar collapsible="offcanvas" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a aria-label="Cobalt" href="/" />}
            >
              <span className="text-base font-semibold text-muted-foreground">
                Cobalt
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarNav.navMain} />
        <NavSecondary items={sidebarNav.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {navUser ? <NavUser user={navUser} /> : <NavUserSkeleton />}
      </SidebarFooter>
    </Sidebar>
  );
}
