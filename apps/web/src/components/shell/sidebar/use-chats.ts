import { queries } from "@cobalt-web/zero";
import { useQuery } from "@rocicorp/zero/react";

export interface ChatRow {
  readonly chatId: string;
  readonly title: string | null;
  readonly updatedAt: number | null;
  readonly createdAt: number | null;
}

export function useChats() {
  const [rows] = useQuery(queries.chats.list());
  return rows as readonly ChatRow[];
}
