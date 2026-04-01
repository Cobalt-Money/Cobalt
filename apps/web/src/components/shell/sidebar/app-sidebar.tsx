import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import {
  AppleStocksIcon,
  ArrowReloadHorizontalIcon,
  AiChat02Icon,
  ChartBarLineIcon,
  Folder01Icon,
  Home04Icon,
  NewsIcon,
  SearchDollarIcon,
  CreditCardIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentProps } from "react";

import { useAppSession } from "@/lib/providers/app-session";

import { NavMain } from "./nav/nav-main";
import { NavUser } from "./nav/nav-user";
import { NavUserSkeleton } from "./nav/skeleton/nav-user-skeleton";
import { useChats } from "./use-chats";

const sidebarNav = {
  navMain: [
    {
      icon: <HugeiconsIcon icon={Home04Icon} strokeWidth={2} />,
      title: "Dashboard",
      url: "/dashboard",
    },
    {
      icon: <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} />,
      title: "Accounts",
      url: "/accounts",
    },
    {
      icon: <HugeiconsIcon icon={AppleStocksIcon} strokeWidth={2} />,
      title: "Brokerage",
      url: "/brokerage",
    },
    {
      icon: <HugeiconsIcon icon={SearchDollarIcon} strokeWidth={2} />,
      title: "Research",
      url: "/research",
    },
    {
      icon: <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
      title: "Document Hub",
      url: "/documents",
    },
    {
      icon: <HugeiconsIcon icon={ArrowReloadHorizontalIcon} strokeWidth={2} />,
      title: "Transactions",
      url: "/transactions",
    },
    {
      icon: <HugeiconsIcon icon={NewsIcon} strokeWidth={2} />,
      title: "News",
      url: "/news",
    },
    {
      icon: <HugeiconsIcon icon={ChartBarLineIcon} strokeWidth={2} />,
      title: "Prediction Markets",
      url: "/prediction-markets",
    },
    {
      icon: <HugeiconsIcon icon={AiChat02Icon} strokeWidth={2} />,
      title: "AI Chat",
      url: "/ai-chat",
    },
  ],
};

function truncateTitle(title: string, maxLength = 25): string {
  return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title;
}

function ChatsGroup() {
  const chats = useChats();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarMenu className="gap-0.5">
      {chats.map((chat) => {
        const chatPath = `/ai-chat/${chat.chatId}`;
        return (
          <SidebarMenuItem key={chat.chatId}>
            <SidebarMenuButton
              className="px-2"
              isActive={pathname === chatPath}
              render={
                <Link
                  aria-label={chat.title ?? "Chat"}
                  to="/ai-chat/$chatId"
                  params={{ chatId: chat.chatId }}
                />
              }
            >
              <span className="truncate">
                {truncateTitle(chat.title ?? chat.chatId)}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

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
      <SidebarHeader className="p-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="px-2"
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
        <SidebarGroup className="p-1.5">
          <SidebarGroupLabel className="px-2">Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <ChatsGroup />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-1.5">
        {navUser ? <NavUser user={navUser} /> : <NavUserSkeleton />}
      </SidebarFooter>
    </Sidebar>
  );
}
