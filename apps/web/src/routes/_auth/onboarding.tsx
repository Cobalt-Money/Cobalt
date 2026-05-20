import { Button } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { createFileRoute, Navigate, redirect, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AccessStep } from "@/components/onboarding/access-step";
import { AnywhereStep } from "@/components/onboarding/anywhere-step";
import { BuildStep } from "@/components/onboarding/build-step";
import { ChatStep } from "@/components/onboarding/chat-step";
import { CommandStep } from "@/components/onboarding/command-step";
import { ConnectStep } from "@/components/onboarding/connect-step";
import { MobileStep } from "@/components/onboarding/mobile-step";
import { OpenSourceStep } from "@/components/onboarding/open-source-step";
import { PremiseStep } from "@/components/onboarding/premise-step";
import { ThemeStep } from "@/components/onboarding/theme-step";
import { TransactionsStep } from "@/components/onboarding/transactions-step";
import { authClient } from "@/lib/clients/auth-client";
import { fireSideCannons } from "@/lib/confetti";
import { useAppSession } from "@/lib/providers/app-session";

export const Route = createFileRoute("/_auth/onboarding")({
  beforeLoad: ({ context, search }) => {
    if (import.meta.env.DEV && search.preview === "1") {
      return;
    }
    if (context.auth.isPending) {
      return;
    }
    const { user } = context.auth;
    if (user?.onboardedAt || user?.isAnonymous) {
      throw redirect({ to: "/home" });
    }
  },
  component: OnboardingRoute,
  staticData: { title: "Welcome to Cobalt" },
  validateSearch: (search: Record<string, unknown>): { preview?: string } => {
    const preview = typeof search.preview === "string" ? search.preview : undefined;
    return preview ? { preview } : {};
  },
});

type StepId =
  | "premise"
  | "open-source"
  | "theme"
  | "access"
  | "transactions"
  | "chat"
  | "command"
  | "anywhere"
  | "build"
  | "connect"
  | "mobile";

const WIDE_STEPS = new Set<StepId>([
  "access",
  "transactions",
  "chat",
  "anywhere",
  "build",
  "mobile",
  "connect",
]);

function widthClassForStep(stepId: StepId | undefined): string {
  if (!stepId) {
    return "max-w-md";
  }
  if (WIDE_STEPS.has(stepId)) {
    return "max-w-3xl";
  }
  if (stepId === "theme") {
    return "max-w-lg";
  }
  return "max-w-md";
}

const STEPS: readonly StepId[] = [
  "theme",
  "premise",
  "open-source",
  "access",
  "transactions",
  "chat",
  "command",
  "anywhere",
  "build",
  "mobile",
  "connect",
];

function OnboardingRoute() {
  const session = useAppSession();
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [premisePhase, setPremisePhase] = useState(0);
  const [openSourcePhase, setOpenSourcePhase] = useState(0);

  const stepId = STEPS[stepIdx];

  const finish = useCallback(async () => {
    setFinishing(true);
    try {
      if (session.data) {
        await authClient.updateUser({
          onboardedAt: new Date(),
          onboardingStep: null,
        });
        await session.refetch?.();
      }
      fireSideCannons();
      await navigate({ to: "/home" });
    } catch (error) {
      console.error("[onboarding] failed to mark complete", error);
      toast.error("Could not finish onboarding. Try again.");
      setFinishing(false);
    }
  }, [navigate, session]);

  const next = useCallback(() => {
    if (stepId === "premise" && premisePhase === 0) {
      setPremisePhase(1);
      return;
    }
    if (stepId === "open-source" && openSourcePhase === 0) {
      setOpenSourcePhase(1);
      return;
    }
    if (stepIdx >= STEPS.length - 1) {
      void finish();
      return;
    }
    setStepIdx((i) => i + 1);
    if (session.data) {
      const nextId = STEPS[stepIdx + 1];
      void authClient.updateUser({ onboardingStep: nextId });
    }
  }, [stepId, premisePhase, openSourcePhase, stepIdx, finish, session.data]);

  const back = useCallback(() => {
    if (stepId === "premise" && premisePhase === 1) {
      setPremisePhase(0);
      return;
    }
    if (stepId === "open-source" && openSourcePhase === 1) {
      setOpenSourcePhase(0);
      return;
    }
    setStepIdx((i) => Math.max(0, i - 1));
  }, [stepId, premisePhase, openSourcePhase]);

  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) {
      return;
    }
    if (!session.data) {
      return;
    }
    resumedRef.current = true;
    const u = session.data.user as { onboardingStep?: string | null } | undefined;
    const saved = u?.onboardingStep;
    if (!saved) {
      return;
    }
    const i = STEPS.indexOf(saved as StepId);
    if (i > 0) {
      setStepIdx(i);
    }
  }, [session.data]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const t = e.target as HTMLElement | null;
        if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next]);

  if (session.isPending) {
    return null;
  }
  if (!session.data) {
    return <Navigate replace to="/" />;
  }
  const user = session.data.user as {
    isAnonymous?: boolean;
    onboardedAt?: Date | string | null;
  };
  if (user.isAnonymous || user.onboardedAt) {
    return <Navigate replace to="/home" />;
  }

  return (
    <div className="relative flex h-svh w-full flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-6">
        <span className="font-semibold text-lg tracking-tight">Cobalt</span>
        <button
          className="text-muted-foreground text-xs hover:text-foreground"
          disabled={finishing}
          onClick={() => void finish()}
          type="button"
        >
          Skip
        </button>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-start overflow-hidden px-8 pt-32">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            initial={{ opacity: 0, y: 8 }}
            key={stepId}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={cn("flex w-full flex-col items-center", widthClassForStep(stepId))}
          >
            {stepId === "premise" && <PremiseStep phase={premisePhase} />}
            {stepId === "open-source" && <OpenSourceStep phase={openSourcePhase} />}
            {stepId === "theme" && <ThemeStep />}
            {stepId === "access" && <AccessStep />}
            {stepId === "transactions" && <TransactionsStep />}
            {stepId === "chat" && <ChatStep />}
            {stepId === "command" && <CommandStep />}
            {stepId === "anywhere" && <AnywhereStep />}
            {stepId === "build" && <BuildStep />}
            {stepId === "connect" && <ConnectStep onConnect={() => void finish()} />}
            {stepId === "mobile" && <MobileStep />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="flex flex-col items-center gap-3 px-8 pt-2 pb-12 2xl:pb-32">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <div className="flex w-full items-center justify-between">
            <Button
              className="h-9 px-4"
              disabled={finishing || stepIdx === 0}
              onClick={back}
              size="sm"
              type="button"
              variant="outline"
            >
              Back
            </Button>
            <Button
              className="h-9 px-6"
              disabled={finishing}
              onClick={next}
              size="sm"
              type="button"
            >
              {stepIdx === STEPS.length - 1 ? "Get started" : "Continue"}
            </Button>
          </div>
          <Dots active={stepIdx} total={STEPS.length} />
          <span className="text-muted-foreground text-xs">Press Enter to continue</span>
        </div>
      </footer>
    </div>
  );
}

function Dots({ active, total }: { active: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          aria-current={i === active ? "step" : undefined}
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
          key={i}
          className={cn(
            "h-1 rounded-full transition-all",
            i === active ? "w-6 bg-foreground" : "w-1 bg-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}
