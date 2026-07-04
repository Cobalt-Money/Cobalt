import { useCallback, useEffect, useRef, useState } from "react";

import { parseNdjson } from "../accounts/parse-ndjson";

const STORAGE_KEY = "cobalt:demo-seed-run";
const RECONNECT_DELAY_MS = 1500;
const MAX_RECONNECTS = 10;

export type DemoSeedPhase =
  | "checking"
  | "accounts"
  | "tags"
  | "transactions"
  | "holdings"
  | "snapshots"
  | "investments"
  | "chats"
  | "done"
  | "skipped"
  | "error";

export interface DemoSeedEvent {
  phase: DemoSeedPhase;
  status: "start" | "done";
  userId: string;
  detail?: Record<string, unknown>;
  at: number;
}

export interface DemoSeedProgress {
  runId: string | null;
  phase: DemoSeedPhase | null;
  isRunning: boolean;
  lastEvent: DemoSeedEvent | null;
}

/**
 * Subscribes to `/api/demo/progress/:runId` when a runId was stashed in
 * sessionStorage by DemoProvider prior to the hard reload. Reconnects on
 * unexpected stream close (Vercel function timeout, network blip) so the
 * loader stays up until the workflow actually emits a terminal event.
 * Clears the key once a terminal event (`done` / `skipped` / `error`) is
 * received.
 */
export function useDemoSeedProgress(): DemoSeedProgress {
  const [runId, setRunId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY),
  );
  const [lastEvent, setLastEvent] = useState<DemoSeedEvent | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(() => runId !== null);
  const reconnectCountRef = useRef(0);
  const lastEventIndexRef = useRef(0);

  const terminate = useCallback(() => {
    setIsRunning(false);
    window.sessionStorage.removeItem(STORAGE_KEY);
    setRunId(null);
  }, []);

  useEffect(() => {
    if (!runId) {
      return;
    }

    const controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    async function connect() {
      try {
        const url =
          lastEventIndexRef.current > 0
            ? `/api/demo/progress/${runId}?startIndex=${lastEventIndexRef.current}`
            : `/api/demo/progress/${runId}`;

        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok || !response.body) {
          terminate();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseNdjson<DemoSeedEvent>(buffer);
          buffer = parsed.rest;
          for (const event of parsed.events) {
            lastEventIndexRef.current += 1;
            setLastEvent(event);
            if (
              (event.phase === "done" || event.phase === "skipped" || event.phase === "error") &&
              event.status === "done"
            ) {
              controller.abort();
              terminate();
              return;
            }
          }
        }

        // Stream closed without terminal — reconnect if budget remains.
        if (reconnectCountRef.current < MAX_RECONNECTS) {
          reconnectCountRef.current += 1;
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        } else {
          terminate();
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        if (reconnectCountRef.current < MAX_RECONNECTS) {
          reconnectCountRef.current += 1;
          reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
        } else {
          terminate();
        }
      }
    }

    void connect();

    return () => {
      controller.abort();
      clearTimeout(reconnectTimer);
    };
  }, [runId, terminate]);

  return { isRunning, lastEvent, phase: lastEvent?.phase ?? null, runId };
}
