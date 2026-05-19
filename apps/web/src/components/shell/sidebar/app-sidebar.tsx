import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@cobalt-web/ui/components/sidebar";
import { cn } from "@cobalt-web/ui/lib/utils";
import { ArrowRight01Icon, Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouterState } from "@tanstack/react-router";
import type { ComponentProps, MouseEvent } from "react";
import { useCallback, useMemo, useState } from "react";

import { Link } from "@/components/links";
import { useAppSession } from "@/lib/providers/app-session";

import { DeleteChatDialog } from "./delete-chat-dialog";
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

function isCollapsibleChatPeriod(period: ChatTimePeriod): period is "last30" | "older" {
  return period === "last30" || period === "older";
}

function ChatRowItem({
  chat,
  pathname,
  onRequestDelete,
}: {
  chat: ChatRow;
  pathname: string;
  onRequestDelete: (chat: ChatRow, e: MouseEvent) => void;
}) {
  const chatPath = `/ai-chat/${chat.chatId}`;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={pathname === chatPath}
        render={
          <Link
            aria-label={chat.title ?? "Chat"}
            params={{ chatId: chat.chatId }}
            to="/ai-chat/$chatId"
          />
        }
      >
        <span className="truncate">{truncateTitle(chat.title ?? chat.chatId)}</span>
      </SidebarMenuButton>
      <SidebarMenuAction
        aria-label={`Delete ${chat.title ?? "chat"}`}
        className="right-2 hover:bg-transparent hover:text-destructive"
        onClick={(e) => onRequestDelete(chat, e)}
        showOnHover
      >
        <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
}

function ChatRowList({
  chats,
  pathname,
  onRequestDelete,
}: {
  chats: readonly ChatRow[];
  pathname: string;
  onRequestDelete: (chat: ChatRow, e: MouseEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {chats.map((chat) => (
        <ChatRowItem
          chat={chat}
          key={chat.chatId}
          onRequestDelete={onRequestDelete}
          pathname={pathname}
        />
      ))}
    </div>
  );
}

function ChatsGroup() {
  const chats = useChats();
  const chatSections = useMemo(() => groupChatsByTimePeriod(chats), [chats]);
  const [collapsedLast30, setCollapsedLast30] = useState(false);
  const [collapsedOlder, setCollapsedOlder] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [chatToDelete, setChatToDelete] = useState<ChatRow | null>(null);

  const requestDelete = useCallback((chat: ChatRow, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChatToDelete(chat);
  }, []);

  return (
    <SidebarMenu className="gap-0.5">
      <DeleteChatDialog
        chatId={chatToDelete?.chatId ?? null}
        chatTitle={chatToDelete?.title ?? null}
        onOpenChange={(next) => {
          if (!next) {
            setChatToDelete(null);
          }
        }}
        open={chatToDelete !== null}
      />
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
                className="flex w-full items-center gap-1.5 px-3 pt-2 pb-1 text-left font-medium text-muted-foreground text-xs transition-colors hover:text-foreground"
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
                    collapsed ? "rotate-0" : "rotate-90",
                  )}
                  icon={ArrowRight01Icon}
                  strokeWidth={2}
                />
              </button>
            ) : (
              <div className="px-3 pt-2 pb-1 font-medium text-muted-foreground text-xs">
                {section.label}
              </div>
            )}
            {collapsible ? (
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-200 ease-in-out motion-reduce:duration-0",
                  collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                )}
              >
                <div className="overflow-hidden" inert={collapsed}>
                  <ChatRowList
                    chats={section.chats}
                    onRequestDelete={requestDelete}
                    pathname={pathname}
                  />
                </div>
              </div>
            ) : (
              <ChatRowList
                chats={section.chats}
                onRequestDelete={requestDelete}
                pathname={pathname}
              />
            )}
          </div>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const session = useAppSession();
  const authedUser = session.data?.user as
    | { name: string; email?: string; image?: string | null; isAnonymous?: boolean }
    | undefined;
  const navUser =
    authedUser === undefined
      ? null
      : {
          avatar: authedUser.image ?? "",
          email: authedUser.email ?? "",
          isAnonymous: Boolean(authedUser.isAnonymous),
          name: authedUser.name,
        };

  return (
    <Sidebar collapsible="offcanvas" variant="inset" {...props}>
      <SidebarHeader className="p-1.5">{navUser ? <NavUser user={navUser} /> : null}</SidebarHeader>
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
