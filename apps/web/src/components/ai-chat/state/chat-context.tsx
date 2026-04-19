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

import {
  normalizeGatewayModelId,
  useAgentSettings,
} from "./agent-settings-context";

// Shape of a Zero-synced message part. Fields match the zero schema; any can be
// null for parts that don't use that field.
interface ZeroMessagePart {
  type: unknown;
  text_text: unknown;
  reasoning_text: unknown;
  tool_state: unknown;
  tool_toolCallId: unknown;
  tool_input: unknown;
  tool_output: unknown;
  tool_errorText: unknown;
  data: unknown;
}

interface ZeroMessageRow {
  messageId: unknown;
  role: unknown;
  createdAt: unknown;
  parts: readonly ZeroMessagePart[];
}

function partRowToUIPart(
  p: ZeroMessagePart
): UIMessage["parts"][number] | null {
  const type = typeof p.type === "string" ? p.type : null;
  if (!type) {
    return null;
  }
  if (type === "text") {
    if (p.text_text === null || p.text_text === undefined) {
      return null;
    }
    return { text: String(p.text_text), type: "text" };
  }
  if (type === "reasoning") {
    if (p.reasoning_text === null || p.reasoning_text === undefined) {
      return null;
    }
    return { text: String(p.reasoning_text), type: "reasoning" };
  }
  if (type.startsWith("tool-")) {
    if (!p.tool_toolCallId || !p.tool_state) {
      return null;
    }
    const toolPart: Record<string, unknown> = {
      state: p.tool_state,
      toolCallId: p.tool_toolCallId,
      type,
    };
    if (p.tool_input) {
      toolPart.input = p.tool_input;
    }
    if (p.tool_output) {
      toolPart.output = p.tool_output;
    }
    if (p.tool_errorText) {
      toolPart.errorText = p.tool_errorText;
    }
    return toolPart as UIMessage["parts"][number];
  }
  if (type.startsWith("data-") && p.data) {
    return { data: p.data, type } as UIMessage["parts"][number];
  }
  if (type === "step-start") {
    return { type: "step-start" } as UIMessage["parts"][number];
  }
  return null;
}

function zeroRowToFullUIMessage(row: ZeroMessageRow): UIMessage {
  return {
    id: String(row.messageId),
    parts: row.parts
      .map(partRowToUIPart)
      .filter((p): p is UIMessage["parts"][number] => p !== null),
    role: String(row.role) as "user" | "assistant",
  };
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

export interface QueuedMessage {
  id: string;
  text: string;
  chatId: string;
}

interface StreamState {
  /** Full in-flight assistant message while streaming (kept until Zero confirms sync). */
  inFlightMessage: UIMessage | null;
  isStreaming: boolean;
  /** When the current stream started — used to detect Zero sync completion. */
  streamStartedAt: Date | null;
}

interface ChatContextValue extends StreamState {
  submit: (chatId: string | undefined, content: string) => Promise<void>;
  /** Abort the in-flight stream (does nothing if not streaming). */
  stop: () => void;
  /** Resolve a pending tool call (e.g. askUser) and resume the agent. */
  addToolOutput: (opts: {
    chatId: string;
    toolCallId: string;
    output: unknown;
  }) => Promise<void>;
  /** Messages queued while streaming; auto-dispatched when stream ends. */
  queuedMessages: QueuedMessage[];
  removeFromQueue: (id: string) => void;
  updateInQueue: (id: string, text: string) => void;
  /** Called by ChatView once Zero has synced the new assistant message. */
  clearStream: () => void;
  /** Called by ChatView on every Zero message update. */
  setZeroMessages: (rows: readonly ZeroMessageRow[]) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChat must be used within ChatProvider");
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

export function ChatProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { settings } = useAgentSettings();
  const [state, setState] = useState<StreamState>(IDLE);
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const zeroMessagesRef = useRef<readonly ZeroMessageRow[]>([]);
  const queueRef = useRef<QueuedMessage[]>([]);
  const forceDispatchRef = useRef(false);
  const serverUrl = env.VITE_SERVER_URL;

  useEffect(() => {
    queueRef.current = queuedMessages;
  }, [queuedMessages]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const setZeroMessages = useCallback((rows: readonly ZeroMessageRow[]) => {
    zeroMessagesRef.current = rows;
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  // Lower-level stream driver used by both submit and addToolOutput.
  const runStream = useCallback(
    async (chatId: string, message: UIMessage, messages: UIMessage[]) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setState({
        inFlightMessage: null,
        isStreaming: true,
        streamStartedAt: new Date(),
      });

      const { effort, model, mode, reasoning } = settings;
      const baseModel = normalizeGatewayModelId(model);
      const modelId = reasoning ? `${baseModel}+reasoning` : baseModel;

      try {
        const res = await fetch(`${serverUrl}/api/chat/${chatId}/stream`, {
          body: JSON.stringify({
            effort,
            message,
            messages,
            mode,
            model: modelId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: abort.signal,
        });

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
        // Clear abortRef only if it still points at this stream's controller —
        // a newer runStream call may have replaced it.
        if (abortRef.current === abort) {
          abortRef.current = null;
        }
      }
    },
    [serverUrl, settings]
  );

  const submit = useCallback(
    async (chatId: string | undefined, content: string) => {
      let activeChatId = chatId;

      if (!activeChatId) {
        try {
          const res = await fetch(`${serverUrl}/api/chat`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            method: "POST",
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

      // If a stream is in progress, queue the message instead of sending.
      if (abortRef.current && !abortRef.current.signal.aborted) {
        setQueuedMessages((prev) => [
          ...prev,
          { chatId: activeChatId, id: crypto.randomUUID(), text: content },
        ]);
        return;
      }

      const userMessage: UIMessage = {
        id: crypto.randomUUID(),
        parts: [{ text: content, type: "text" }],
        role: "user",
      };

      const historyUIMessages = zeroMessagesRef.current.map(
        zeroRowToFullUIMessage
      );
      const allMessages: UIMessage[] = [...historyUIMessages, userMessage];

      await runStream(activeChatId, userMessage, allMessages);
    },
    [navigate, runStream, serverUrl]
  );

  const addToolOutput = useCallback(
    async ({
      chatId,
      toolCallId,
      output,
    }: {
      chatId: string;
      toolCallId: string;
      output: unknown;
    }) => {
      const history = zeroMessagesRef.current.map(zeroRowToFullUIMessage);
      // Find the newest assistant message carrying this tool call and patch it.
      let patched = false;
      const updated = history.map((msg) => {
        if (patched || msg.role !== "assistant") {
          return msg;
        }
        const idx = msg.parts.findIndex(
          (p) =>
            typeof p.type === "string" &&
            p.type.startsWith("tool-") &&
            (p as { toolCallId?: string }).toolCallId === toolCallId
        );
        if (idx === -1) {
          return msg;
        }
        const newParts = [...msg.parts];
        const existing = newParts[idx] as Record<string, unknown>;
        newParts[idx] = {
          ...existing,
          output,
          state: "output-available",
        } as UIMessage["parts"][number];
        patched = true;
        return { ...msg, parts: newParts };
      });

      if (!patched) {
        console.warn("[chat] addToolOutput: no matching tool call", toolCallId);
        return;
      }

      const lastAssistant = updated.at(-1);
      if (!lastAssistant || lastAssistant.role !== "assistant") {
        console.warn("[chat] addToolOutput: last message is not assistant");
        return;
      }

      await runStream(chatId, lastAssistant, updated);
    },
    [runStream]
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueuedMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateInQueue = useCallback((id: string, text: string) => {
    setQueuedMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text } : m))
    );
  }, []);

  // Auto-dispatch the head of the queue once streaming ends.
  useEffect(() => {
    if (state.isStreaming || forceDispatchRef.current) {
      return;
    }
    const [next] = queueRef.current;
    if (!next) {
      return;
    }
    forceDispatchRef.current = true;
    setQueuedMessages((prev) => prev.slice(1));
    const run = async () => {
      try {
        await submit(next.chatId, next.text);
      } finally {
        forceDispatchRef.current = false;
      }
    };
    run();
  }, [state.isStreaming, submit]);

  const clearStream = useCallback(() => {
    setState(IDLE);
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      addToolOutput,
      clearStream,
      queuedMessages,
      removeFromQueue,
      setZeroMessages,
      stop,
      submit,
      updateInQueue,
    }),
    [
      state,
      addToolOutput,
      clearStream,
      queuedMessages,
      removeFromQueue,
      setZeroMessages,
      stop,
      submit,
      updateInQueue,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
