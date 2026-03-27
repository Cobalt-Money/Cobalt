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

import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";

const data = {
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
  user: {
    avatar: "/avatars/shadcn.jpg",
    email: "m@example.com",
    name: "shadcn",
  },
};

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
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
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
