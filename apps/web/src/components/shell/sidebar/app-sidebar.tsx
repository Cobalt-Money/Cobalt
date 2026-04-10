import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import { queries } from "@cobalt-web/zero";
import {
  AppleStocksIcon,
  ArrowDown01Icon,
  ArrowReloadHorizontalIcon,
  ArrowRight01Icon,
  // ChartBarLineIcon,
  // Folder01Icon,
  Home04Icon,
  NewsIcon,
  SearchDollarIcon,
  CreditCardIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useZero } from "@rocicorp/zero/react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

import { useAppSession } from "@/lib/providers/app-session";

import { NavMain } from "./nav/nav-main";
import { NavUser } from "./nav/nav-user";
import { NavUserSkeleton } from "./nav/skeleton/nav-user-skeleton";
import { useChats } from "./use-chats";
import type { ChatRow } from "./use-chats";

const DAY_MS = 86_400_000;

type ChatTimePeriod = "today" | "yesterday" | "last7" | "last30" | "older";

const CHAT_PERIOD_ORDER: readonly ChatTimePeriod[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "older",
] as const;

const CHAT_PERIOD_LABEL: Record<ChatTimePeriod, string> = {
  last30: "Last 30 Days",
  last7: "Last 7 Days",
  older: "Older",
  today: "Today",
  yesterday: "Yesterday",
};

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function chatTimePeriod(ts: number, now: Date): ChatTimePeriod {
  if (ts <= 0) {
    return "older";
  }
  const startToday = startOfLocalDay(now);
  const startYesterday = startToday - DAY_MS;
  if (ts >= startToday) {
    return "today";
  }
  if (ts >= startYesterday && ts < startToday) {
    return "yesterday";
  }
  const start7 = startToday - 7 * DAY_MS;
  if (ts >= start7) {
    return "last7";
  }
  const start30 = startToday - 30 * DAY_MS;
  if (ts >= start30) {
    return "last30";
  }
  return "older";
}

function groupChatsByTimePeriod(chats: readonly ChatRow[]) {
  const buckets = new Map<ChatTimePeriod, ChatRow[]>();
  for (const p of CHAT_PERIOD_ORDER) {
    buckets.set(p, []);
  }
  const now = new Date();
  for (const chat of chats) {
    const ts = chat.updatedAt ?? 0;
    const period = chatTimePeriod(ts, now);
    const list = buckets.get(period);
    if (list) {
      list.push(chat);
    }
  }
  const sections: {
    chats: ChatRow[];
    label: string;
    period: ChatTimePeriod;
  }[] = [];
  for (const period of CHAT_PERIOD_ORDER) {
    const list = buckets.get(period);
    if (list && list.length > 0) {
      sections.push({
        chats: list,
        label: CHAT_PERIOD_LABEL[period],
        period,
      });
    }
  }
  return sections;
}

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
    // {
    //   icon: <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />,
    //   title: "Document Hub",
    //   url: "/documents",
    // },
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
    // {
    //   icon: <HugeiconsIcon icon={ChartBarLineIcon} strokeWidth={2} />,
    //   title: "Prediction Markets",
    //   url: "/prediction-markets",
    // },
  ],
};

const NEW_CHAT_SIDEBAR_BUTTON_CLASS =
  "rounded-lg bg-input/80 px-2 transition-colors hover:bg-input hover:text-muted-foreground active:bg-input/90 data-active:bg-input data-active:text-foreground data-active:hover:bg-input/95 [&_svg]:size-[15px]";

function truncateTitle(title: string, maxLength = 25): string {
  return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title;
}

function isCollapsibleChatPeriod(
  period: ChatTimePeriod
): period is "last30" | "older" {
  return period === "last30" || period === "older";
}

function ChatsGroup() {
  const chats = useChats();
  const chatSections = useMemo(() => groupChatsByTimePeriod(chats), [chats]);
  const [collapsedLast30, setCollapsedLast30] = useState(false);
  const [collapsedOlder, setCollapsedOlder] = useState(false);
  const zero = useZero();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const prefetchMessages = useCallback(
    (chatId: string) => {
      zero.preload(queries.chats.messages({ chatId }));
    },
    [zero]
  );

  const handlePointerEnter = useCallback(
    (chatId: string) => {
      hoverTimer.current = setTimeout(() => {
        prefetchMessages(chatId);
      }, 150);
    },
    [prefetchMessages]
  );

  const handlePointerLeave = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  return (
    <SidebarMenu className="gap-0.5">
      <SidebarMenuItem>
        <SidebarMenuButton
          className={NEW_CHAT_SIDEBAR_BUTTON_CLASS}
          isActive={pathname === "/ai-chat"}
          render={<Link aria-label="New Chat" to="/ai-chat" />}
        >
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
          <span className="truncate">New Chat</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {chatSections.map((section) => {
        const collapsible = isCollapsibleChatPeriod(section.period);
        let collapsed = false;
        if (section.period === "last30") {
          collapsed = collapsedLast30;
        } else if (section.period === "older") {
          collapsed = collapsedOlder;
        }

        return (
          <div className="flex flex-col gap-0.5" key={section.period}>
            {collapsible ? (
              <button
                type="button"
                className="flex w-full items-center gap-1.5 px-2 pt-2 pb-1 text-left font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
                aria-expanded={!collapsed}
                onClick={() => {
                  if (section.period === "last30") {
                    setCollapsedLast30((v) => !v);
                  } else {
                    setCollapsedOlder((v) => !v);
                  }
                }}
              >
                <span className="min-w-0 flex-1 truncate">{section.label}</span>
                <HugeiconsIcon
                  aria-hidden
                  className="size-3.5 shrink-0"
                  icon={collapsed ? ArrowRight01Icon : ArrowDown01Icon}
                  strokeWidth={2}
                />
              </button>
            ) : (
              <div className="px-2 pt-2 pb-1 font-medium text-muted-foreground text-xs">
                {section.label}
              </div>
            )}
            {!collapsed &&
              section.chats.map((chat) => {
                const chatPath = `/ai-chat/${chat.chatId}`;
                return (
                  <SidebarMenuItem key={chat.chatId}>
                    <SidebarMenuButton
                      className="px-2"
                      isActive={pathname === chatPath}
                      onPointerEnter={() => handlePointerEnter(chat.chatId)}
                      onPointerLeave={handlePointerLeave}
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
          </div>
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
        {navUser ? <NavUser user={navUser} /> : <NavUserSkeleton />}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarNav.navMain} />
        <SidebarGroup className="p-1.5">
          <SidebarGroupContent>
            <ChatsGroup />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
