import { SubscriptionStateBanner } from "@cobalt-web/ui/cobalt/subscription/subscription-state-banner";
import { Button } from "@cobalt-web/ui/components/button";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import { subscriptionsApi } from "@/lib/clients/api-client";

function UpgradeAction() {
  const navigate = useNavigate();
  return (
    <Button
      onClick={() => {
        void navigate({ to: "/settings" });
      }}
      size="xs"
      variant="outline"
    >
      Upgrade
    </Button>
  );
}

function BillingPortalAction({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await subscriptionsApi.billingPortal.$post();
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url;
          return;
        }
        setLoading(false);
      }}
      size="xs"
      variant="outline"
    >
      {loading ? <Spinner className="size-3" /> : null}
      {loading ? "Opening…" : label}
    </Button>
  );
}

export function BillingBanner() {
  const { tier, status, cancelAtPeriodEnd, periodEnd, connectionStates, isLoading } =
    useSubscriptionStatus();

  if (isLoading) {
    return null;
  }

  if (status === "past_due") {
    return (
      <SubscriptionStateBanner
        action={<BillingPortalAction label="Update billing" />}
        periodEnd={periodEnd}
        variant="past-due"
      />
    );
  }

  if (cancelAtPeriodEnd) {
    return (
      <SubscriptionStateBanner
        action={<BillingPortalAction label="Reactivate" />}
        periodEnd={periodEnd}
        variant="cancel-scheduled"
      />
    );
  }

  const frozen = connectionStates.filter((c) => c.frozen).length;
  if (tier === "free" && frozen > 0) {
    return (
      <SubscriptionStateBanner
        action={<UpgradeAction />}
        frozenCount={frozen}
        variant="free-cap-exceeded"
      />
    );
  }

  return null;
}

/** True when the billing banner is currently visible — used by AuthShellWithOutlet to apply `data-billing-banner` for sidebar shift. */
export function useBillingBannerActive(): boolean {
  const { tier, status, cancelAtPeriodEnd, connectionStates, isLoading } = useSubscriptionStatus();
  if (isLoading) {
    return false;
  }
  if (status === "past_due" || cancelAtPeriodEnd) {
    return true;
  }
  return tier === "free" && connectionStates.some((c) => c.frozen);
}
