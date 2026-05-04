import { env } from "@cobalt-web/env/web";
import { CobaltCard } from "@cobalt-web/ui/cobalt/card";
import { Shimmer } from "@cobalt-web/ui/components/ai-elements/shimmer";
import confetti from "canvas-confetti";
import { useEffect, useState } from "react";

import { useOnboarding } from "./onboarding-context";
import { parseNdjson } from "./parse-ndjson";

const FLOATING_CARD_CHROME =
  "-translate-x-1/2 fixed top-4 left-1/2 z-50 bg-sidebar shadow-none dark:bg-sidebar";

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

function fireSideCannons() {
  const end = Date.now() + 3000;
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
  const frame = () => {
    if (Date.now() > end) {
      return;
    }
    confetti({
      angle: 60,
      colors,
      origin: { x: 0, y: 0.5 },
      particleCount: 2,
      spread: 55,
      startVelocity: 60,
    });
    confetti({
      angle: 120,
      colors,
      origin: { x: 1, y: 0.5 },
      particleCount: 2,
      spread: 55,
      startVelocity: 60,
    });
    requestAnimationFrame(frame);
  };
  frame();
}

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
    <CobaltCard className={`${FLOATING_CARD_CHROME} w-96 gap-2 p-4`}>
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
    </CobaltCard>
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

  const bucketState: Record<Bucket, "pending" | "active" | "done"> = {
    connecting: "pending",
    done: "pending",
    syncing: "pending",
  };
  for (const [phase, event] of latestByPhase) {
    const bucket = PHASE_TO_BUCKET[phase as keyof typeof PHASE_TO_BUCKET];
    if (!bucket) {
      continue;
    }
    if (event.status === "done" && bucketState[bucket] !== "active") {
      bucketState[bucket] = "done";
    }
    if (event.status === "start") {
      bucketState[bucket] = "active";
    }
  }

  const activeBucket = BUCKET_ORDER.find((b) => bucketState[b] === "active");
  const firstPending = BUCKET_ORDER.find((b) => bucketState[b] === "pending");
  const currentBucket: Bucket = isDone ? "done" : (activeBucket ?? firstPending ?? "connecting");

  const completedCount = BUCKET_ORDER.filter((b) => bucketState[b] === "done").length;
  const percent = Math.round((completedCount / BUCKET_ORDER.length) * 100);
  const currentLabel = BUCKET_LABELS[currentBucket];

  return (
    <CobaltCard className={`${FLOATING_CARD_CHROME} w-80 gap-2 p-4`}>
      <div className="mb-2 h-5 text-center text-sm">
        {isDone ? (
          <span className="font-medium">{currentLabel}</span>
        ) : (
          <Shimmer as="span" className="font-medium">
            {currentLabel}
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
    </CobaltCard>
  );
}
