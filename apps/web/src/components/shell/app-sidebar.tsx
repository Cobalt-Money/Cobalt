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
  DashboardSquare01Icon,
  Menu01Icon,
  ChartHistogramIcon,
  Folder01Icon,
  UserGroupIcon,
  Settings05Icon,
  HelpCircleIcon,
  SearchIcon,
  CommandIcon,
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
      url: "#",
    },
    {
      icon: <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />,
      title: "Lifecycle",
      url: "#",
    },
    {
      icon: <HugeiconsIcon icon={ChartHistogramIcon} strokeWidth={2} />,
      title: "Analytics",
      url: "#",
    },
    {
      icon: <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
      title: "Projects",
      url: "#",
    },
    {
      icon: <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />,
      title: "Team",
      url: "#",
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
              render={<a aria-label="Acme Inc." href="/" />}
            >
              <HugeiconsIcon
                icon={CommandIcon}
                strokeWidth={2}
                className="size-5!"
              />
              <span className="text-base font-semibold">Acme Inc.</span>
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
