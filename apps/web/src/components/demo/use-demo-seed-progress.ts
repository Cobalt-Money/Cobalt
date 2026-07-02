import { useEffect, useState } from "react";

import { parseNdjson } from "../accounts/parse-ndjson";

const STORAGE_KEY = "cobalt:demo-seed-run";

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
 * sessionStorage by DemoProvider prior to the hard reload. Clears the key
 * once a terminal event (`done` / `skipped` / `error`) is received so the
 * next full-page nav doesn't re-subscribe to a stale run.
 */
export function useDemoSeedProgress(): DemoSeedProgress {
  const [runId, setRunId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY),
  );
  const [lastEvent, setLastEvent] = useState<DemoSeedEvent | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(() => runId !== null);

  useEffect(() => {
    if (!runId) {
      return;
    }
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`/api/demo/progress/${runId}`, {
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          setIsRunning(false);
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
            setLastEvent(event);
            if (
              (event.phase === "done" || event.phase === "skipped" || event.phase === "error") &&
              event.status === "done"
            ) {
              setIsRunning(false);
              window.sessionStorage.removeItem(STORAGE_KEY);
              setRunId(null);
              controller.abort();
              return;
            }
          }
        }
        setIsRunning(false);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setIsRunning(false);
        }
      }
    })();

    return () => controller.abort();
  }, [runId]);

  return { isRunning, lastEvent, phase: lastEvent?.phase ?? null, runId };
}
