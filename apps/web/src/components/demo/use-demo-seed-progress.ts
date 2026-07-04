import { useEffect, useRef, useState } from "react";

import { parseNdjson } from "../accounts/parse-ndjson";

const STORAGE_KEY = "cobalt:demo-seed-run";
const POLL_INTERVAL_MS = 2000;
// Extra wait after workflow `done` to let Zero replicate the inserted rows
// before the loader unmounts and the app shell renders.
const POST_DONE_DELAY_MS = 5000;

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

const TERMINAL_PHASES = new Set<DemoSeedPhase>(["done", "skipped", "error"]);

/**
 * Polls `/api/demo/progress/:runId?startIndex=N` every 2s. Each request is
 * short-lived — the server returns buffered events since startIndex and closes
 * immediately, so there's no Vercel Function timeout risk. Stops when a
 * terminal event is received.
 */
export function useDemoSeedProgress(): DemoSeedProgress {
  const [runId, setRunId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.sessionStorage.getItem(STORAGE_KEY),
  );
  const [lastEvent, setLastEvent] = useState<DemoSeedEvent | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(() => runId !== null);
  const nextIndexRef = useRef(0);

  useEffect(() => {
    if (!runId) {
      return;
    }

    let stopped = false;

    async function poll() {
      if (stopped) {
        return;
      }
      try {
        const response = await fetch(
          `/api/demo/progress/${runId}?startIndex=${nextIndexRef.current}`,
        );
        if (!response.ok || !response.body) {
          // Run not found or error — stop polling.
          setIsRunning(false);
          window.sessionStorage.removeItem(STORAGE_KEY);
          setRunId(null);
          return;
        }
        const text = await response.text();
        const { events } = parseNdjson<DemoSeedEvent>(text);
        let terminal = false;
        for (const event of events) {
          nextIndexRef.current += 1;
          setLastEvent(event);
          if (TERMINAL_PHASES.has(event.phase) && event.status === "done") {
            terminal = true;
          }
        }
        if (terminal) {
          // Delay dismissal so Zero has time to replicate the inserted rows
          // before the app shell renders. Without this the dashboard loads
          // empty and rows trickle in while the user watches.
          setTimeout(() => {
            setIsRunning(false);
            window.sessionStorage.removeItem(STORAGE_KEY);
            setRunId(null);
          }, POST_DONE_DELAY_MS);
          return;
        }
      } catch {
        // Network error — just retry next tick.
      }
      if (!stopped) {
        setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      stopped = true;
    };
  }, [runId]);

  return { isRunning, lastEvent, phase: lastEvent?.phase ?? null, runId };
}
