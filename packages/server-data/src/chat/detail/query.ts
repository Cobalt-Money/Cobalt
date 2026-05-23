import { db } from "@cobalt-web/db";

import { ApiError } from "../_shared/errors.js";
import { partDbToUi } from "../_shared/lib.js";
import type { ChatMessage } from "../_shared/schema.js";

/**
 * Load messages + vote map for a single chat in one relational query.
 * Throws `ApiError(404, "chat_not_found")` if the chat is missing or unowned.
 */
export async function getChatDetail(
  userId: string,
  chatId: string,
): Promise<{
  id: string;
  messages: ChatMessage[];
  votes: Record<string, "positive" | "negative">;
}> {
  const row = await db.query.chats.findFirst({
    where: {
      chatId: { eq: chatId },
      userId: { eq: userId },
    },
    with: {
      messages: {
        orderBy: { createdAt: "asc" },
        with: {
          parts: {
            orderBy: { order: "asc" },
          },
          // NOTE: votes intentionally fetched in a separate roundtrip — see below.
        },
      },
    },
  });

  if (!row) {
    throw new ApiError(404, "chat_not_found", "Chat not found");
  }

  // Votes live in `messageVotes` and join via `messageId`. We fetch them in a
  // separate query rather than nesting `with: { votes: true }` because the
  // join column is nullable — Drizzle's nested-select + leftJoin returns a
  // whole-null object when any nested column is null, which would drop
  // legitimate messages from the response.
  const voteRows = await db.query.messageVotes.findMany({
    where: {
      message: {
        chatId: { eq: chatId },
      },
      userId: { eq: userId },
    },
  });
  const votes: Record<string, "positive" | "negative"> = {};
  for (const v of voteRows) {
    votes[v.messageId] = v.vote;
  }

  return {
    id: chatId,
    messages: row.messages.map((msg) => ({
      id: msg.messageId,
      parts: msg.parts.map(partDbToUi).filter((p): p is Record<string, unknown> => p !== null),
      role: msg.role,
    })),
    votes,
  };
}
