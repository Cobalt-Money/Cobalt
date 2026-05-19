import { Dialog, DialogContent } from "@cobalt-web/ui/components/dialog";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/clients/auth-client";
import { subscribeUpgradePrompt } from "@/lib/upgrade-prompt";
import type { UpgradeReason } from "@/lib/upgrade-prompt";

const COPY: Record<UpgradeReason, { description: string; title: string }> = {
  connection_limit_reached: {
    description: "Upgrade to Pro to link unlimited accounts.",
    title: "Connect more accounts with Pro",
  },
  extended_thinking_not_allowed: {
    description:
      "Extended thinking lets the AI plan deeper before answering. Pro unlocks it on Opus.",
    title: "Upgrade for extended thinking",
  },
  model_not_allowed: {
    description:
      "Free tier runs on Claude Haiku 4.5. Upgrade to Pro to use Claude Opus 4.7 for deeper analysis.",
    title: "Upgrade for advanced AI models",
  },
};

function buildSuccessUrl(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return `${window.location.origin}/settings?upgrade=success`;
}

function buildCancelUrl(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return window.location.href;
}

export function UpgradePromptHost() {
  const [reason, setReason] = useState<UpgradeReason | null>(null);
  const [submitting, setSubmitting] = useState<"monthly" | "annual" | null>(null);

  useEffect(
    () =>
      subscribeUpgradePrompt((next) => {
        setReason(next);
      }),
    [],
  );

  const handleClose = (open: boolean) => {
    if (open || submitting) {
      return;
    }
    setReason(null);
  };

  const upgrade = async (plan: "cobalt-monthly" | "cobalt-annual") => {
    setSubmitting(plan === "cobalt-monthly" ? "monthly" : "annual");
    try {
      const { error } = await authClient.subscription.upgrade({
        cancelUrl: buildCancelUrl(),
        plan,
        successUrl: buildSuccessUrl(),
      });
      if (error) {
        throw new Error(error.message ?? "Failed to start checkout");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
      setSubmitting(null);
    }
  };

  const copy = reason ? COPY[reason] : null;

  return (
    <Dialog onOpenChange={handleClose} open={reason !== null}>
      <DialogContent className="sm:max-w-xl">
        <div className="flex flex-col gap-3 px-6 pt-5 pb-6">
          <h2 className="font-semibold text-foreground text-lg leading-none">
            {copy?.title ?? "Upgrade to Pro"}
          </h2>
          <p className="text-muted-foreground text-sm">{copy?.description ?? null}</p>
          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            <button
              className="flex flex-col items-start gap-1 rounded-lg border border-foreground/10 bg-foreground/[0.03] p-4 text-left transition-colors hover:bg-foreground/[0.07] disabled:opacity-60"
              disabled={submitting !== null}
              onClick={() => upgrade("cobalt-monthly")}
              type="button"
            >
              <span className="font-medium text-foreground text-sm">
                {submitting === "monthly" ? "Opening checkout…" : "Pro · monthly"}
              </span>
              <span className="text-muted-foreground text-xs">$6.99 / month · cancel anytime</span>
            </button>
            <button
              className="flex flex-col items-start gap-1 rounded-lg border border-primary/30 bg-primary/[0.06] p-4 text-left transition-colors hover:bg-primary/[0.1] disabled:opacity-60"
              disabled={submitting !== null}
              onClick={() => upgrade("cobalt-annual")}
              type="button"
            >
              <span className="font-medium text-foreground text-sm">
                {submitting === "annual" ? "Opening checkout…" : "Pro · annual"}
              </span>
              <span className="text-muted-foreground text-xs">$70 / year · save 16%</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
