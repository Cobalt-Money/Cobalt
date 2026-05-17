import { env } from "@cobalt-web/env/web";
import type { Message as ChatMessage, Part } from "@cobalt-web/zero";
import { useNavigate } from "@tanstack/react-router";
import { DefaultChatTransport, readUIMessageStream } from "ai";
import type { FileUIPart, UIMessage, UIMessageChunk } from "ai";
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

import { handleTierGateResponse } from "@/lib/upgrade-prompt";

import { normalizeGatewayModelId, useAgentSettings } from "./agent-settings-context";

type ZeroMessagePart = Part;
type ZeroMessageRow = ChatMessage & { readonly parts: readonly Part[] };

function isNullish<T>(v: T | null | undefined): v is null | undefined {
  return v === null || v === undefined;
}

function filePartFromRow(p: ZeroMessagePart): UIMessage["parts"][number] | null {
  if (isNullish(p.file_url) || isNullish(p.file_mediaType)) {
    return null;
  }
  const filePart: Record<string, unknown> = {
    mediaType: p.file_mediaType,
    type: "file",
    url: p.file_url,
  };
  if (!isNullish(p.file_filename)) {
    filePart.filename = p.file_filename;
  }
  return filePart as UIMessage["parts"][number];
}

function partRowToUIPart(p: ZeroMessagePart): UIMessage["parts"][number] | null {
  const { type } = p;
  if (type === "text") {
    if (isNullish(p.text_text)) {
      return null;
    }
    return { text: p.text_text, type: "text" };
  }
  if (type === "reasoning") {
    if (isNullish(p.reasoning_text)) {
      return null;
    }
    return { text: p.reasoning_text, type: "reasoning" };
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
    if (!isNullish(p.tool_input)) {
      toolPart.input = p.tool_input;
    }
    if (!isNullish(p.tool_output)) {
      toolPart.output = p.tool_output;
    }
    if (p.tool_errorText) {
      toolPart.errorText = p.tool_errorText;
    }
    return toolPart as UIMessage["parts"][number];
  }
  if (type === "file") {
    return filePartFromRow(p);
  }
  if (type.startsWith("data-") && !isNullish(p.data)) {
    return { data: p.data, type } as UIMessage["parts"][number];
  }
  if (type === "step-start") {
    return { type: "step-start" } as UIMessage["parts"][number];
  }
  return null;
}

function zeroRowToFullUIMessage(row: ZeroMessageRow): UIMessage {
  return {
    id: row.messageId,
    parts: row.parts
      .map(partRowToUIPart)
      .filter((p): p is UIMessage["parts"][number] => p !== null),
    role: row.role as "user" | "assistant",
  };
}

/**
 * Minimal subclass to expose `processResponseStream` as public.
 * `DefaultChatTransport` parses the AI SDK SSE format into `UIMessageChunk`s,
 * handling text, reasoning, tool-input, and all other part types.
 */
class InternalTransport extends DefaultChatTransport<UIMessage> {
  public decodeStream(stream: ReadableStream<Uint8Array>): ReadableStream<UIMessageChunk> {
    return super.processResponseStream(stream);
  }
}

const transport = new InternalTransport();

export interface QueuedMessage {
  id: string;
  text: string;
  chatId: string;
  files?: FileUIPart[];
}

interface StreamState {
  /** Full in-flight assistant message while streaming (kept until Zero confirms sync). */
  inFlightMessage: UIMessage | null;
  isStreaming: boolean;
  /** When the current stream started — used to detect Zero sync completion. */
  streamStartedAt: Date | null;
}

interface ChatContextValue extends StreamState {
  submit: (
    chatId: string | undefined,
    content: string,
    files?: readonly FileUIPart[],
  ) => Promise<void>;
  /** Abort the in-flight stream (does nothing if not streaming). */
  stop: () => void;
  /** Resolve a pending tool call (e.g. askUser) and resume the agent. */
  addToolOutput: (opts: { chatId: string; toolCallId: string; output: unknown }) => Promise<void>;
  /**
   * Resolve multiple pending tool calls in a single resume. Use when the
   * model emitted parallel tool calls (e.g. askUser × N) so all results are
   * sent back together — otherwise unresolved parts are dropped by
   * convertToModelMessages and the model re-emits them.
   */
  addToolOutputs: (opts: {
    chatId: string;
    items: { toolCallId: string; output: unknown }[];
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
    [],
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

      const { effort, model, reasoning } = settings;
      const baseModel = normalizeGatewayModelId(model);
      const modelId = reasoning ? `${baseModel}+reasoning` : baseModel;

      // RAF-throttled flush: AI SDK can emit chunks far faster than React can
      // usefully render. Coalesce them so React re-renders at most once per
      // frame, matching what useChat's experimental_throttle provides.
      let pendingMessage: UIMessage | null = null;
      let rafId: number | null = null;
      const flushPending = () => {
        rafId = null;
        const msg = pendingMessage;
        if (msg && !abort.signal.aborted) {
          setState((prev) => ({ ...prev, inFlightMessage: msg }));
        }
      };
      const cancelPending = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };

      try {
        const res = await fetch(`${serverUrl}/api/chat/${chatId}/stream`, {
          body: JSON.stringify({
            effort,
            message,
            messages,
            model: modelId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: abort.signal,
        });

        if (!res.ok || !res.body) {
          const gated = res.body ? await handleTierGateResponse(res) : false;
          if (!gated) {
            const errorText = await res.text().catch(() => "(unreadable)");
            console.error(`[chat-stream] ${res.status} ${res.statusText}:`, errorText);
            toast.error(getToastMessage(res.status));
          }
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
          pendingMessage = msg;
          if (rafId === null) {
            rafId = requestAnimationFrame(flushPending);
          }
        }

        // Stream ended naturally — flush the final snapshot synchronously so
        // the completed message lands before the Zero-sync handoff runs.
        cancelPending();
        if (pendingMessage && !abort.signal.aborted) {
          setState((prev) => ({ ...prev, inFlightMessage: pendingMessage }));
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("[chat-stream] unexpected error:", error);
        }
      } finally {
        cancelPending();
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
    [serverUrl, settings],
  );

  const submit = useCallback(
    async (chatId: string | undefined, content: string, files?: readonly FileUIPart[]) => {
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
          {
            chatId: activeChatId,
            files: files ? [...files] : undefined,
            id: crypto.randomUUID(),
            text: content,
          },
        ]);
        return;
      }

      const fileParts: UIMessage["parts"] = (files ?? []).map((f) => ({
        filename: f.filename,
        mediaType: f.mediaType,
        type: "file",
        url: f.url,
      }));
      const textParts: UIMessage["parts"] = content.trim() ? [{ text: content, type: "text" }] : [];
      const parts = [...fileParts, ...textParts];
      if (parts.length === 0) {
        return;
      }

      const userMessage: UIMessage = {
        id: crypto.randomUUID(),
        parts,
        role: "user",
      };

      const historyUIMessages = zeroMessagesRef.current.map(zeroRowToFullUIMessage);
      const allMessages: UIMessage[] = [...historyUIMessages, userMessage];

      await runStream(activeChatId, userMessage, allMessages);
    },
    [navigate, runStream, serverUrl],
  );

  const addToolOutputs = useCallback(
    async ({
      chatId,
      items,
    }: {
      chatId: string;
      items: { toolCallId: string; output: unknown }[];
    }) => {
      if (items.length === 0) {
        return;
      }
      const outputById = new Map(items.map((i) => [i.toolCallId, i.output]));
      const remaining = new Set(outputById.keys());

      const history = zeroMessagesRef.current.map(zeroRowToFullUIMessage);
      const updated = history.map((msg) => {
        if (msg.role !== "assistant" || remaining.size === 0) {
          return msg;
        }
        let changed = false;
        const newParts = msg.parts.map((p) => {
          const id = (p as { toolCallId?: string }).toolCallId;
          if (
            !id ||
            !remaining.has(id) ||
            typeof p.type !== "string" ||
            !p.type.startsWith("tool-")
          ) {
            return p;
          }
          remaining.delete(id);
          changed = true;
          return {
            ...(p as Record<string, unknown>),
            output: outputById.get(id),
            state: "output-available",
          } as UIMessage["parts"][number];
        });
        return changed ? { ...msg, parts: newParts } : msg;
      });

      if (remaining.size === items.length) {
        console.warn("[chat] addToolOutputs: no matching tool calls", [...remaining]);
        return;
      }
      if (remaining.size > 0) {
        console.warn("[chat] addToolOutputs: some tool calls not found", [...remaining]);
      }

      const lastAssistant = updated.at(-1);
      if (!lastAssistant || lastAssistant.role !== "assistant") {
        console.warn("[chat] addToolOutputs: last message is not assistant");
        return;
      }

      await runStream(chatId, lastAssistant, updated);
    },
    [runStream],
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
      await addToolOutputs({ chatId, items: [{ output, toolCallId }] });
    },
    [addToolOutputs],
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueuedMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const updateInQueue = useCallback((id: string, text: string) => {
    setQueuedMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text } : m)));
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
        await submit(next.chatId, next.text, next.files);
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
      addToolOutputs,
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
      addToolOutputs,
      clearStream,
      queuedMessages,
      removeFromQueue,
      setZeroMessages,
      stop,
      submit,
      updateInQueue,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
