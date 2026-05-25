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
  Search02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Link } from "@/components/links";

const navItemClassName =
  "rounded-md px-2 py-1.5 text-[15px] font-[350] text-foreground/60 data-active:text-foreground data-active:font-[350] [&_svg]:size-[18px] [&_svg]:shrink-0";

const NAV_MAIN_ITEMS = [
  {
    icon: <HugeiconsIcon icon={Home04Icon} strokeWidth={1.5} />,
    title: "Home",
    url: "/home" as const,
  },
  {
    icon: <HugeiconsIcon icon={CreditCardIcon} strokeWidth={1.5} />,
    title: "Accounts",
    url: "/accounts" as const,
  },
  {
    icon: <HugeiconsIcon icon={AppleStocksIcon} strokeWidth={1.5} />,
    title: "Brokerage",
    url: "/brokerage" as const,
  },
  {
    icon: <HugeiconsIcon icon={Search02Icon} strokeWidth={1.5} />,
    title: "Research",
    url: "/research" as const,
  },
  {
    icon: <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={1.5} />,
    title: "Transactions",
    url: "/transactions" as const,
  },
  {
    icon: <HugeiconsIcon icon={Calendar02Icon} strokeWidth={1.5} />,
    title: "Subscriptions",
    url: "/subscriptions" as const,
  },
  {
    icon: <HugeiconsIcon icon={NewsIcon} strokeWidth={1.5} />,
    title: "News",
    url: "/news" as const,
  },
];

function NavMainItem({
  icon,
  title,
  url,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly url: (typeof NAV_MAIN_ITEMS)[number]["url"];
}) {
  const isActive = useRouterState({ select: (s) => s.location.pathname === url });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className={navItemClassName}
        isActive={isActive}
        render={<Link aria-label={title} preload="viewport" to={url} />}
        tooltip={title}
      >
        {icon}
        <span>{title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function NavMain() {
  return (
    <SidebarGroup className="p-1.5">
      <SidebarGroupContent className="flex flex-col gap-1.5">
        <SidebarMenu className="gap-0">
          {NAV_MAIN_ITEMS.map((item) => (
            <NavMainItem icon={item.icon} key={item.title} title={item.title} url={item.url} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
