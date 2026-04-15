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
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouterState } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";

import { InstantLink } from "@/components/instant-link";
import { useAppSession } from "@/lib/providers/app-session";

import { NavMain } from "./nav/nav-main";
import { NavUser } from "./nav/nav-user";
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <SidebarMenu className="gap-0.5">
      <SidebarMenuItem>
        <SidebarMenuButton
          className={NEW_CHAT_SIDEBAR_BUTTON_CLASS}
          isActive={pathname === "/ai-chat"}
          render={<InstantLink aria-label="New Chat" to="/ai-chat" />}
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
                  className={cn(
                    "size-3.5 shrink-0 transition-transform duration-100 ease-out",
                    collapsed ? "rotate-0" : "rotate-90"
                  )}
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                />
              </button>
            ) : (
              <div className="px-2 pt-2 pb-1 font-medium text-muted-foreground text-xs">
                {section.label}
              </div>
            )}
            <div
              className={cn(
                "grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:duration-0",
                collapsible && collapsed
                  ? "grid-rows-[0fr] opacity-0"
                  : "grid-rows-[1fr] opacity-100"
              )}
            >
              <div className="min-h-0" inert={collapsible && collapsed}>
                <div className="flex flex-col gap-0.5">
                  {section.chats.map((chat) => {
                    const chatPath = `/ai-chat/${chat.chatId}`;
                    return (
                      <SidebarMenuItem key={chat.chatId}>
                        <SidebarMenuButton
                          className="px-2"
                          isActive={pathname === chatPath}
                          render={
                            <InstantLink
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
              </div>
            </div>
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
        {navUser ? <NavUser user={navUser} /> : null}
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <SidebarGroup className="p-1.5">
          <SidebarGroupContent>
            <ChatsGroup />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
