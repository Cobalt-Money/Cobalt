import { env } from "@cobalt-web/env/web";
import { useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, readUIMessageStream } from "ai";
import type { UIMessage, UIMessageChunk } from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

// Minimal shape of a Zero message row that we need for history.
interface ZeroMessageRow {
  messageId: unknown;
  role: unknown;
  createdAt: unknown;
  parts: readonly { type: unknown; text_text: unknown }[];
}

/** Convert Zero message rows → UIMessage[] for the server history payload. */
function zeroToUIMessages(rows: readonly ZeroMessageRow[]): UIMessage[] {
  return rows.map((row) => ({
    createdAt:
      typeof row.createdAt === "number" ? new Date(row.createdAt) : new Date(),
    id: String(row.messageId),
    parts: row.parts
      .filter(
        (p) =>
          p.type === "text" && p.text_text !== null && p.text_text !== undefined
      )
      .map((p) => ({ text: String(p.text_text), type: "text" as const })),
    role: String(row.role) as "user" | "assistant",
  }));
}

/**
 * Minimal subclass to expose `processResponseStream` as public.
 * `DefaultChatTransport` parses the AI SDK SSE format into `UIMessageChunk`s,
 * handling text, reasoning, tool-input, and all other part types.
 */
class InternalTransport extends DefaultChatTransport<UIMessage> {
  public decodeStream(
    stream: ReadableStream<Uint8Array>
  ): ReadableStream<UIMessageChunk> {
    return super.processResponseStream(stream);
  }
}

const transport = new InternalTransport();

interface StreamState {
  /** Full in-flight assistant message while streaming (kept until Zero confirms sync). */
  inFlightMessage: UIMessage | null;
  isStreaming: boolean;
  /** When the current stream started — used to detect Zero sync completion. */
  streamStartedAt: Date | null;
}

interface ChatStreamContextValue extends StreamState {
  submit: (chatId: string | undefined, content: string) => Promise<void>;
  /** Called by ChatView once Zero has synced the new assistant message. */
  clearStream: () => void;
  /** Called by ChatView on every Zero message update. */
  setZeroMessages: (rows: readonly ZeroMessageRow[]) => void;
}

const ChatStreamContext = createContext<ChatStreamContextValue | null>(null);

export function useChatStream(): ChatStreamContextValue {
  const ctx = useContext(ChatStreamContext);
  if (!ctx) {
    throw new Error("useChatStream must be used within ChatStreamProvider");
  }
  return ctx;
}

const IDLE: StreamState = {
  inFlightMessage: null,
  isStreaming: false,
  streamStartedAt: null,
};

function getToastMessage(status: number): string {
  if (status === 503) {
    return "AI is not configured on the server.";
  }
  if (status === 403) {
    return "You need an active subscription to use AI chat.";
  }
  return `Failed to send message (${status}).`;
}

export function ChatStreamProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<StreamState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  const zeroMessagesRef = useRef<readonly ZeroMessageRow[]>([]);
  const serverUrl = env.VITE_SERVER_URL;

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const setZeroMessages = useCallback((rows: readonly ZeroMessageRow[]) => {
    zeroMessagesRef.current = rows;
  }, []);

  const submit = useCallback(
    async (chatId: string | undefined, content: string) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      let activeChatId = chatId;

      if (!activeChatId) {
        try {
          const res = await fetch(`${serverUrl}/api/chat`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            method: "POST",
            signal: abort.signal,
          });
          if (!res.ok) {
            return;
          }
          const data = (await res.json()) as { chatId: string };
          activeChatId = data.chatId;
        } catch {
          return;
        }
        await navigate({
          params: { chatId: activeChatId },
          to: "/ai-chat/$chatId",
        });
      }

      setState({
        inFlightMessage: null,
        isStreaming: true,
        streamStartedAt: new Date(),
      });

      const userMessage: UIMessage = {
        id: crypto.randomUUID(),
        parts: [{ text: content, type: "text" }],
        role: "user",
      };

      const historyUIMessages = zeroToUIMessages(zeroMessagesRef.current);
      const allMessages: UIMessage[] = [...historyUIMessages, userMessage];

      try {
        const res = await fetch(
          `${serverUrl}/api/chat/${activeChatId}/stream`,
          {
            body: JSON.stringify({
              message: userMessage,
              messages: allMessages,
            }),
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            method: "POST",
            signal: abort.signal,
          }
        );

        if (!res.ok || !res.body) {
          const errorText = await res.text().catch(() => "(unreadable)");
          console.error(
            `[chat-stream] ${res.status} ${res.statusText}:`,
            errorText
          );
          toast.error(getToastMessage(res.status));
          setState((prev) => ({ ...prev, isStreaming: false }));
          return;
        }

        const chunkStream = transport.decodeStream(res.body);
        const initialMessage: UIMessage = {
          id: crypto.randomUUID(),
          parts: [],
          role: "assistant",
        };

        const messageStream = readUIMessageStream({
          message: initialMessage,
          stream: chunkStream,
        });

        for await (const msg of messageStream) {
          if (abort.signal.aborted) {
            break;
          }
          setState((prev) => ({ ...prev, inFlightMessage: msg }));
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("[chat-stream] unexpected error:", error);
        }
      } finally {
        if (!abort.signal.aborted) {
          setState((prev) => ({ ...prev, isStreaming: false }));
        }
      }
    },
    [navigate, serverUrl]
  );

  const clearStream = useCallback(() => {
    setState(IDLE);
  }, []);

  const value = useMemo(
    () => ({ ...state, clearStream, setZeroMessages, submit }),
    [state, clearStream, setZeroMessages, submit]
  );

  return (
    <ChatStreamContext.Provider value={value}>
      {children}
    </ChatStreamContext.Provider>
  );
}
