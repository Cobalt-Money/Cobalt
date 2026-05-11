import type { Chat } from "@cobalt-web/zero";
import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";

export type ChatRow = Pick<Chat, "chatId" | "title" | "updatedAt" | "createdAt">;

export function useChats() {
  const [rows] = useQuery(queries.chats.list());
  return rows as readonly ChatRow[];
}
