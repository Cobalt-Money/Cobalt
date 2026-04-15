import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  Calendar02Icon,
  CreditCardIcon,
  Home04Icon,
  NewsIcon,
  SearchDollarIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouterState } from "@tanstack/react-router";

import { InstantLink } from "@/components/instant-link";

const navItemClassName =
  "rounded-md px-2 py-1.5 text-[15px] text-foreground [&_svg]:size-[15px] [&_svg]:shrink-0";

const NAV_MAIN_ITEMS = [
  {
    icon: <HugeiconsIcon icon={Home04Icon} strokeWidth={2} />,
    title: "Dashboard",
    url: "/dashboard" as const,
  },
  {
    icon: <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />,
    title: "Accounts",
    url: "/accounts" as const,
  },
  {
    icon: <HugeiconsIcon icon={AppleStocksIcon} strokeWidth={2} />,
    title: "Brokerage",
    url: "/brokerage" as const,
  },
  {
    icon: <HugeiconsIcon icon={SearchDollarIcon} strokeWidth={2} />,
    title: "Research",
    url: "/research" as const,
  },
  {
    icon: <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} />,
    title: "Transactions",
    url: "/transactions" as const,
  },
  {
    icon: <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />,
    title: "Subscriptions",
    url: "/subscriptions" as const,
  },
  {
    icon: <HugeiconsIcon icon={NewsIcon} strokeWidth={2} />,
    title: "News",
    url: "/news" as const,
  },
];

export function NavMain() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarGroup className="p-1.5">
      <SidebarGroupContent className="flex flex-col gap-1.5">
        <SidebarMenu className="gap-0">
          {NAV_MAIN_ITEMS.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                className={navItemClassName}
                isActive={pathname === item.url}
                render={<InstantLink aria-label={item.title} to={item.url} />}
                tooltip={item.title}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
