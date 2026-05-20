import { env } from "@cobalt-web/env/web";
import { Card } from "@cobalt-web/ui/components/card";
import { Shimmer } from "@cobalt-web/ui/components/ai-elements/shimmer";
import { useEffect, useRef, useState } from "react";

import { fireSideCannons } from "@/lib/confetti";

import { useOnboarding } from "./onboarding-context";
import { parseNdjson } from "./parse-ndjson";

const FLOATING_CARD_CHROME =
  "-translate-x-1/2 fixed top-4 left-1/2 z-50 bg-sidebar shadow-none dark:bg-sidebar";

/** Duration must match `--text-swap-dur` in globals.css `.t-text-swap`. */
const TEXT_SWAP_DURATION_MS = 200;

/**
 * Three-phase text swap driven by the `.t-text-swap` stylesheet:
 *   1. `.is-exit` — old text slides up + blurs + fades.
 *   2. After `--text-swap-dur`, swap textContent and apply
 *      `.is-enter-start` (jump to below, transitions disabled).
 *   3. Force reflow, drop `.is-enter-start` so the new text animates in.
 */
function TextSwap({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || displayed === value) {
      return;
    }

    el.classList.add("is-exit");
    const t = setTimeout(() => {
      setDisplayed(value);
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      // Force reflow so the browser registers the "below" position before we
      // drop the class and let the transition animate the entry back to 0.
      void el.getBoundingClientRect().height;
      el.classList.remove("is-enter-start");
    }, TEXT_SWAP_DURATION_MS);

    return () => {
      clearTimeout(t);
      el.classList.remove("is-exit", "is-enter-start");
    };
  }, [value, displayed]);

  return (
    <span className="t-text-swap" ref={ref}>
      {displayed}
    </span>
  );
}

type Phase =
  | "exchange"
  | "validate"
  | "persist"
  | "waiting_for_link"
  | "waiting_for_plaid"
  | "accounts"
  | "balances"
  | "transactions"
  | "historical"
  | "holdings"
  | "investment_transactions"
  | "liabilities"
  | "done"
  | "connecting"
  | "duplicate"
  | "cancelled"
  | "error";

type Bucket = "connecting" | "syncing" | "done";

const BUCKET_LABELS: Record<Bucket, string> = {
  connecting: "Connecting your account",
  done: "Your account is ready",
  syncing: "Syncing your data",
};

const PHASE_TO_BUCKET: Record<Exclude<Phase, "duplicate" | "error" | "cancelled">, Bucket> = {
  accounts: "syncing",
  balances: "syncing",
  connecting: "connecting",
  done: "done",
  exchange: "connecting",
  historical: "syncing",
  holdings: "syncing",
  investment_transactions: "syncing",
  liabilities: "syncing",
  persist: "connecting",
  transactions: "syncing",
  validate: "connecting",
  waiting_for_link: "connecting",
  waiting_for_plaid: "syncing",
};

const BUCKET_ORDER: Bucket[] = ["connecting", "syncing", "done"];

interface ProgressEvent {
  phase: Phase;
  status: "start" | "done";
  itemId: string;
  at: number;
  detail?: {
    duplicates?: { name: string; createdAt: string | Date }[];
    message?: string;
    reason?: string;
    skipped?: boolean;
  };
}

function useProgressStream(runId: string | null, onStale: () => void) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) {
      setEvents([]);
      setStreamError(null);
      return;
    }

    const controller = new AbortController();

    async function read() {
      try {
        const res = await fetch(`${env.VITE_SERVER_URL}/api/plaid/progress/${runId}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          if (res.status === 404 || res.status === 410) {
            onStale();
            return;
          }
          throw new Error(`progress stream failed: ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseNdjson<ProgressEvent>(buffer);
          buffer = parsed.rest;
          if (parsed.events.length > 0) {
            setEvents((prev) => [...prev, ...parsed.events]);
          }
        }
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
        setStreamError(error instanceof Error ? error.message : "stream error");
      }
    }

    read();
    return () => {
      controller.abort();
    };
  }, [runId, onStale]);

  return { events, streamError };
}

export function OnboardingProgress() {
  const { onboardingRunId, finishOnboarding } = useOnboarding();
  const { events, streamError } = useProgressStream(onboardingRunId, finishOnboarding);

  const latestByPhase = new Map<Phase, ProgressEvent>();
  for (const event of events) {
    latestByPhase.set(event.phase, event);
  }
  const isDone = latestByPhase.get("done")?.status === "done";
  const isDuplicate = latestByPhase.get("duplicate")?.status === "done";
  const errorEvent = latestByPhase.get("error");
  const hasError = errorEvent?.status === "done";

  useEffect(() => {
    if (!isDone || isDuplicate || hasError) {
      return;
    }
    fireSideCannons();
    const t = setTimeout(() => {
      finishOnboarding();
    }, 2500);
    return () => {
      clearTimeout(t);
    };
  }, [isDone, isDuplicate, hasError, finishOnboarding]);

  if (!onboardingRunId) {
    return null;
  }

  if (isDuplicate) {
    const duplicates = latestByPhase.get("duplicate")?.detail?.duplicates ?? [];
    return (
      <TerminalCard
        body={
          <>
            <p className="mb-1">This account is already connected:</p>
            <ul className="list-inside list-disc text-muted-foreground">
              {duplicates.map((d) => (
                <li key={d.name}>
                  {d.name} (linked on{" "}
                  {new Date(d.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  )
                </li>
              ))}
            </ul>
            <p className="mt-2 text-muted-foreground">
              Remove it first and re-link if you want to refresh the connection.
            </p>
          </>
        }
        onDismiss={finishOnboarding}
        title="Account already linked"
        tone="warning"
      />
    );
  }

  if (hasError) {
    return (
      <TerminalCard
        body={
          <p className="text-muted-foreground">
            {errorEvent?.detail?.message ??
              "We couldn't finish connecting this account. Please try again."}
          </p>
        }
        onDismiss={finishOnboarding}
        title="Connection failed"
        tone="destructive"
      />
    );
  }

  return <OnboardingProgressCard events={events} streamError={streamError} />;
}

function TerminalCard({
  body,
  onDismiss,
  title,
  tone,
}: {
  body: React.ReactNode;
  onDismiss: () => void;
  title: string;
  tone: "warning" | "destructive";
}) {
  const titleColor = tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card variant="subtle" className={`${FLOATING_CARD_CHROME} w-96 gap-2 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`font-medium text-sm ${titleColor}`}>{title}</p>
        <button
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="mt-2 text-sm">{body}</div>
    </Card>
  );
}

function OnboardingProgressCard({
  events,
  streamError,
}: {
  events: ProgressEvent[];
  streamError?: string | null;
}) {
  const latestByPhase = new Map<Phase, ProgressEvent>();
  for (const event of events) {
    latestByPhase.set(event.phase, event);
  }
  const isDone = latestByPhase.get("done")?.status === "done";

  // Walk events chronologically and track furthest-progressed bucket. Monotonic
  // — never regresses. Avoids label/bar flicker when a phase `done` for bucket
  // N arrives moments before a phase `start` for the same bucket.
  let maxBucketIndex = 0;
  for (const event of events) {
    const bucket = PHASE_TO_BUCKET[event.phase as keyof typeof PHASE_TO_BUCKET];
    if (!bucket) {
      continue;
    }
    const idx = BUCKET_ORDER.indexOf(bucket);
    if (idx > maxBucketIndex) {
      maxBucketIndex = idx;
    }
  }
  const currentBucket: Bucket = isDone ? "done" : BUCKET_ORDER[maxBucketIndex];
  const percent = Math.round(((maxBucketIndex + (isDone ? 1 : 0)) / BUCKET_ORDER.length) * 100);
  const currentLabel = BUCKET_LABELS[currentBucket];

  return (
    <Card variant="subtle" className={`${FLOATING_CARD_CHROME} w-80 gap-2 p-4`}>
      <div className="mb-2 h-5 text-center text-sm">
        {isDone ? (
          <span className="font-medium">
            <TextSwap value={currentLabel} />
          </span>
        ) : (
          <Shimmer as="span" className="font-medium">
            <TextSwap value={currentLabel} />
          </Shimmer>
        )}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      {streamError ? (
        <div className="mt-2 text-destructive text-xs">
          Progress stream disconnected — your data will still finish importing.
        </div>
      ) : null}
    </Card>
  );
}
