import { formatAlert } from "@cobalt-web/server-data/alerts/formatter";
import { Button } from "@cobalt-web/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { NotificationsSheet } from "@/components/alerts/notifications-sheet";
import type { UserAlertRow } from "@/hooks/use-user-alerts";

export const Route = createFileRoute("/_auth/alerts-preview")({
  component: AlertsPreviewPage,
});

const baseTime = Date.parse("2026-04-19T12:00:00Z");

type MockSeed = Omit<UserAlertRow, "title" | "message"> & { institutionName: string };

const MOCK_SEEDS: readonly MockSeed[] = [
  {
    createdAt: baseTime,
    id: "mock-alert-1",
    institutionName: "Chase",
    metadata: { institutionLogo: null },
    resolvedAt: null,
    source: "plaid",
    sourceId: "mock-plaid-item-1",
    type: "reauth_needed",
    userId: "mock-user",
  },
  {
    createdAt: baseTime - 3_600_000,
    id: "mock-alert-2",
    institutionName: "Bank of America",
    metadata: { institutionLogo: null },
    resolvedAt: null,
    source: "plaid",
    sourceId: "mock-plaid-item-2",
    type: "pending_disconnect",
    userId: "mock-user",
  },
  {
    createdAt: baseTime - 86_400_000,
    id: "mock-alert-3",
    institutionName: "Wells Fargo",
    metadata: { institutionLogo: null },
    resolvedAt: null,
    source: "plaid",
    sourceId: "mock-plaid-item-3",
    type: "new_accounts",
    userId: "mock-user",
  },
  {
    createdAt: baseTime - 2 * 86_400_000,
    id: "mock-alert-4",
    institutionName: "Robinhood",
    metadata: { institutionLogo: null },
    resolvedAt: null,
    source: "snaptrade",
    sourceId: "mock-snaptrade-auth-1",
    type: "connection_broken",
    userId: "mock-user",
  },
];

const MOCK_ALERTS: readonly UserAlertRow[] = MOCK_SEEDS.map(({ institutionName, ...seed }) => {
  const { title, message } = formatAlert({ institutionName, type: seed.type });
  return { ...seed, message, title };
});

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
