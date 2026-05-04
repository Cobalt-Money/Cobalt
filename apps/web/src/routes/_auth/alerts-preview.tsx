import { Button } from "@cobalt-web/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { NotificationsSheet } from "@/components/alerts/notifications-sheet";
import type { UserAlertRow } from "@/hooks/use-user-alerts";

export const Route = createFileRoute("/_auth/alerts-preview")({
  component: AlertsPreviewPage,
});

const baseTime = Date.parse("2026-04-19T12:00:00Z");

const MOCK_ALERTS: readonly UserAlertRow[] = [
  {
    createdAt: baseTime,
    id: "mock-alert-1",
    message: "Reconnect Chase to resume syncing transactions and balances.",
    metadata: {
      institutionLogo: null,
      institutionName: "Chase",
    },
    resolvedAt: null,
    source: "plaid",
    sourceId: "mock-plaid-item-1",
    status: "unread",
    title: "Chase needs re-authentication",
    type: "reauth_needed",
    userId: "mock-user",
  },
  {
    createdAt: baseTime - 3_600_000,
    id: "mock-alert-2",
    message: "Reconnect Bank of America now to avoid losing access.",
    metadata: {
      institutionLogo: null,
      institutionName: "Bank of America",
    },
    resolvedAt: null,
    source: "plaid",
    sourceId: "mock-plaid-item-2",
    status: "unread",
    title: "Bank of America is about to disconnect",
    type: "pending_disconnect",
    userId: "mock-user",
  },
  {
    createdAt: baseTime - 86_400_000,
    id: "mock-alert-3",
    message: "New accounts were added at Wells Fargo. Refresh to sync them.",
    metadata: {
      institutionLogo: null,
      institutionName: "Wells Fargo",
    },
    resolvedAt: null,
    source: "plaid",
    sourceId: "mock-plaid-item-3",
    status: "read",
    title: "New accounts available at Wells Fargo",
    type: "new_accounts",
    userId: "mock-user",
  },
  {
    createdAt: baseTime - 2 * 86_400_000,
    id: "mock-alert-4",
    message: "Reconnect Robinhood to resume syncing positions and activity.",
    metadata: { brokerageName: "Robinhood" },
    resolvedAt: null,
    source: "snaptrade",
    sourceId: "mock-snaptrade-auth-1",
    status: "read",
    title: "Robinhood connection broken",
    type: "connection_broken",
    userId: "mock-user",
  },
];

function AlertsPreviewPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="font-medium text-foreground text-lg">Notifications sheet preview</h1>
      <p className="max-w-md text-center text-muted-foreground text-sm">
        Dev-only route that renders the notifications sheet with mock alerts — real data is disabled
        here. Close and reopen to verify animation.
      </p>
      <Button onClick={() => setOpen(true)} type="button">
        Open notifications
      </Button>
      <NotificationsSheet onOpenChange={setOpen} open={open} previewAlerts={MOCK_ALERTS} />
    </div>
  );
}
