import { cn } from "@cobalt-web/ui/lib/utils";
import { AlertCircleIcon, Clock01Icon, CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";

export type SubscriptionBannerVariant = "free-cap-exceeded" | "past-due" | "cancel-scheduled";

interface Props {
  variant: SubscriptionBannerVariant;
  /** ISO date string — used by `cancel-scheduled` for end-date copy. */
  periodEnd?: string | null;
  /** Frozen connection count for `free-cap-exceeded`. */
  frozenCount?: number;
  /** App-provided CTA (Upgrade / Update billing / Reactivate). */
  action?: ReactNode;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function SubscriptionStateBanner({ variant, periodEnd, frozenCount, action }: Props) {
  const { icon, accent, lead, body } = (() => {
    switch (variant) {
      case "past-due": {
        return {
          accent: "text-destructive",
          body: "We'll keep syncing during the grace period — update billing to avoid losing access.",
          icon: CreditCardIcon,
          lead: "Payment past due",
        };
      }
      case "cancel-scheduled": {
        return {
          accent: "text-warning",
          body: `Subscription ends ${formatDate(periodEnd)} — connections past the free cap will pause then.`,
          icon: Clock01Icon,
          lead: "Cancellation scheduled",
        };
      }
      default: {
        return {
          accent: "text-warning",
          body: `${frozenCount ?? 0} connection${frozenCount === 1 ? "" : "s"} paused — upgrade or disconnect to free a slot.`,
          icon: AlertCircleIcon,
          lead: "Free-tier cap reached",
        };
      }
    }
  })();

  return (
    <output className="fixed inset-x-0 top-0 z-50 flex h-9 shrink-0 items-center justify-center gap-3 border-b border-border bg-background px-4 text-sm text-foreground">
      <HugeiconsIcon className={cn(accent)} icon={icon} size={16} strokeWidth={2} />
      <span>
        <span className="font-semibold">{lead}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        {body}
      </span>
      {action}
    </output>
  );
}
