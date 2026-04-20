import {
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@cobalt-web/ui/components/command";
import { queries, zql } from "@cobalt-web/zero";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";

import { DeleteChatDialog } from "@/components/shell/sidebar/delete-chat-dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatSearchRow {
  chatId: string;
  title: string | null;
  updatedAt: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isCleanLeftClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
}

const ILIKE_WILDCARD = (query: string): string => `%${query}%`;

const parseDate = (date: unknown): Date | null => {
  if (typeof date === "number" || typeof date === "string") {
    return new Date(date);
  }
  return date instanceof Date ? date : null;
};

const formatDate = (date: unknown): string => {
  const parsed = parseDate(date);
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ── ZQL query builders ────────────────────────────────────────────────────────

const buildRecentQuery = () => zql.chats.orderBy("updatedAt", "desc").limit(30);

const buildSearchQuery = (trimmedSearch: string) => {
  const pattern = ILIKE_WILDCARD(trimmedSearch);
  return zql.chats
    .where(({ cmp }) => cmp("title", "ILIKE", pattern))
    .orderBy("updatedAt", "desc")
    .limit(50);
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChatSearch(trimmedSearch: string, enabled: boolean) {
  const zero = useZero();

  const [chatRows] = useQuery(
    trimmedSearch.length > 0
      ? buildSearchQuery(trimmedSearch)
      : buildRecentQuery(),
    { enabled }
  );

  const filteredChats = useMemo<ChatSearchRow[]>(
    () => (enabled ? (chatRows as unknown as ChatSearchRow[]) : []),
    [enabled, chatRows]
  );

  const prefetchedRef = useRef<Set<string>>(new Set());

  const handleHighlight = useCallback(
    (value: string) => {
      if (!enabled) {
        return;
      }
      const [chatId] = value.split(" ", 1);
      if (!chatId || prefetchedRef.current.has(chatId)) {
        return;
      }
      prefetchedRef.current.add(chatId);
      zero.preload(queries.chats.messages({ chatId }));
    },
    [enabled, zero]
  );

  const prefetch = useCallback(() => {
    zero.run(queries.chats.list());
  }, [zero]);

  return { filteredChats, handleHighlight, prefetch };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatSearchResults({
  filteredChats,
  trimmedSearch,
  onSelect,
}: {
  filteredChats: ChatSearchRow[];
  trimmedSearch: string;
  onSelect: (chatId: string) => void;
}) {
  const [chatToDelete, setChatToDelete] = useState<ChatSearchRow | null>(null);

  const requestDelete = useCallback((chat: ChatSearchRow, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setChatToDelete(chat);
  }, []);

  return (
    <>
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
      {filteredChats.length === 0 ? (
        <CommandEmpty>
          {trimmedSearch.length > 0 ? "No chats found." : "No recent chats."}
        </CommandEmpty>
      ) : null}
      <CommandGroup
        heading={trimmedSearch.length > 0 ? "Search results" : "Recent"}
      >
        {filteredChats.map((c) => {
          const title = c.title?.trim() || "Untitled chat";
          return (
            <CommandItem
              key={c.chatId}
              onMouseDown={(e: MouseEvent) => {
                if (isCleanLeftClick(e)) {
                  e.preventDefault();
                  onSelect(c.chatId);
                }
              }}
              onSelect={() => onSelect(c.chatId)}
              value={`${c.chatId} ${title}`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{title}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {formatDate(c.updatedAt)}
                  </span>
                </div>
                <button
                  aria-label={`Delete ${title}`}
                  className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-destructive"
                  onClick={(e) => requestDelete(c, e)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  type="button"
                >
                  <HugeiconsIcon
                    className="size-4"
                    icon={Delete02Icon}
                    strokeWidth={2}
                  />
                </button>
              </div>
            </CommandItem>
          );
        })}
      </CommandGroup>
    </>
  );
}
