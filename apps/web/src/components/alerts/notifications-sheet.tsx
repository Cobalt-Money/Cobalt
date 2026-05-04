import { env } from "@cobalt-web/env/web";
import { Button } from "@cobalt-web/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@cobalt-web/ui/components/empty";
import { ScrollArea } from "@cobalt-web/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@cobalt-web/ui/components/sheet";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AlertCircleIcon,
  BellDotIcon,
  Cancel01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import type { UserAlertRow } from "@/hooks/use-user-alerts";
import { useUserAlerts } from "@/hooks/use-user-alerts";

import { useOnboarding } from "../accounts/onboarding-context";

interface ReauthSession {
  hookToken: string;
  runId: string;
  linkToken: string;
}

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dev-only override so a preview route can render mock alerts. */
  previewAlerts?: readonly UserAlertRow[];
}

interface AlertMetadata {
  brokerageName?: string;
  institutionLogo?: string | null;
  institutionName?: string;
}

function getAlertMetadata(alert: UserAlertRow): AlertMetadata {
  const raw = alert.metadata;
  return (raw && typeof raw === "object" ? raw : {}) as AlertMetadata;
}

function getAlertDisplayName(alert: UserAlertRow): string {
  const meta = getAlertMetadata(alert);
  return meta.institutionName ?? meta.brokerageName ?? "Connection";
}

function getAlertCtaLabel(type: string): string {
  if (type === "new_accounts") {
    return "Refresh connection";
  }
  return "Fix connection";
}

/**
 * Renders a list of active user alerts in a right-side sheet. Each alert
 * exposes a source-aware reconnect CTA (Plaid Link update-mode or the
 * SnapTrade connection portal) plus a dismiss action that hits the server;
 * Zero syncs the row's new status back into the list automatically.
 */
export function NotificationsSheet({ open, onOpenChange, previewAlerts }: NotificationsSheetProps) {
  const live = useUserAlerts();
  const alerts = previewAlerts ?? live.alerts;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [plaidToken, setPlaidToken] = useState<string | null>(null);
  const sessionRef = useRef<ReauthSession | null>(null);
  const { resolveLink, startOnboarding } = useOnboarding();

  const handlePlaidSuccess = useCallback(async () => {
    setPlaidToken(null);
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      return;
    }
    try {
      await resolveLink({
        hookToken: session.hookToken,
        publicToken: "reauth",
      });
      startOnboarding(session.runId);
      toast.success("Bank connection updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not refresh connection");
    }
  }, [resolveLink, startOnboarding]);

  const handlePlaidExit = useCallback(() => {
    setPlaidToken(null);
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      return;
    }
    void (async () => {
      try {
        await resolveLink({
          cancelled: true,
          hookToken: session.hookToken,
        });
      } catch {
        // Best-effort cleanup; server-side timeout is the fallback.
      }
    })();
  }, [resolveLink]);

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    onExit: handlePlaidExit,
    onSuccess: handlePlaidSuccess,
    token: plaidToken,
  });

  useEffect(() => {
    if (plaidToken && plaidReady) {
      openPlaid();
    }
  }, [openPlaid, plaidReady, plaidToken]);

  const handleReconnect = async (alert: UserAlertRow) => {
    if (!alert.sourceId) {
      return;
    }
    setBusyId(alert.id);
    try {
      if (alert.source === "plaid") {
        const res = await fetch(`${env.VITE_SERVER_URL}/api/plaid/link-token/update`, {
          body: JSON.stringify({
            mode: "reauth",
            plaidItemId: alert.sourceId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await res.json()) as {
          error?: string;
          hookToken?: string;
          link_token?: string;
          runId?: string;
        };
        if (!res.ok || !data.link_token || !data.hookToken || !data.runId) {
          throw new Error(data.error ?? "Could not start reconnect");
        }
        sessionRef.current = {
          hookToken: data.hookToken,
          linkToken: data.link_token,
          runId: data.runId,
        };
        setPlaidToken(data.link_token);
      } else if (alert.source === "snaptrade") {
        const res = await fetch(`${env.VITE_SERVER_URL}/api/snaptrade/generate-connection-portal`, {
          body: JSON.stringify({
            broker: "",
            reconnectAuthorizationId: alert.sourceId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await res.json()) as {
          error?: string;
          redirectURI?: string;
        };
        if (!res.ok || !data.redirectURI) {
          throw new Error(data.error ?? "Could not open reconnect");
        }
        window.location.assign(data.redirectURI);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconnect failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDismiss = async (alert: UserAlertRow) => {
    setBusyId(alert.id);
    try {
      const res = await fetch(
        `${env.VITE_SERVER_URL}/api/alerts/${encodeURIComponent(alert.id)}/dismiss`,
        { credentials: "include", method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Dismiss failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dismiss failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Connections that need your attention.</SheetDescription>
        </SheetHeader>

        {alerts.length === 0 ? (
          <Empty className="flex-1">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={BellDotIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>You're all caught up</EmptyTitle>
              <EmptyDescription>No connections need attention right now.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="flex-1">
            <ul className="flex flex-col divide-y">
              {alerts.map((alert) => {
                const meta = getAlertMetadata(alert);
                const name = getAlertDisplayName(alert);
                const isBusy = busyId === alert.id;
                return (
                  <li
                    className={cn(
                      "flex flex-col gap-3 px-6 py-4",
                      alert.status === "unread" && "bg-muted/30",
                    )}
                    key={alert.id}
                  >
                    <div className="flex items-start gap-3">
                      {meta.institutionLogo ? (
                        <img
                          alt=""
                          className="mt-0.5 size-9 shrink-0 rounded-lg border bg-background object-contain"
                          src={meta.institutionLogo}
                        />
                      ) : (
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                          <HugeiconsIcon
                            className="size-5"
                            icon={AlertCircleIcon}
                            strokeWidth={2}
                          />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground text-sm">
                          {alert.title}
                        </div>
                        {alert.message ? (
                          <div className="mt-0.5 text-muted-foreground text-xs">
                            {alert.message}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-12">
                      <Button
                        disabled={isBusy || !alert.sourceId}
                        onClick={() => handleReconnect(alert)}
                        size="sm"
                        type="button"
                        variant="default"
                      >
                        <HugeiconsIcon className="size-4" icon={RefreshIcon} strokeWidth={2} />
                        {isBusy ? "…" : getAlertCtaLabel(alert.type)}
                      </Button>
                      <Button
                        aria-label={`Dismiss alert for ${name}`}
                        disabled={isBusy}
                        onClick={() => handleDismiss(alert)}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <HugeiconsIcon className="size-4" icon={Cancel01Icon} strokeWidth={2} />
                        Dismiss
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
