import { Badge } from "@cobalt-web/ui/components/badge";
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
import { InstitutionLogo } from "@cobalt-web/ui/cobalt/logos/institution-logo";
import { AlertCircleIcon, BellDotIcon, RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import type { UserAlertRow } from "@/hooks/use-user-alerts";
import { useUserAlerts } from "@/hooks/use-user-alerts";
import { plaidApi, snaptradeApi } from "@/lib/clients/api-client";

import { useOnboarding } from "../accounts/onboarding-context";
import type { ReauthSession } from "../accounts/reauth-session";

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

function getAlertCtaLabel(type: string): string {
  if (type === "new_accounts") {
    return "Refresh connection";
  }
  return "Fix connection";
}

/**
 * Renders a list of active user alerts in a right-side sheet. Each alert
 * exposes a source-aware reconnect CTA (Plaid Link update-mode or the
 * SnapTrade connection portal). Alerts persist until the underlying
 * connection is repaired — there is no user-facing dismiss.
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
        const res = await plaidApi.linkToken.update.$post({
          json: { mode: "reauth", plaidItemId: alert.sourceId },
        });
        const data = await res.json();
        if (!res.ok || !("link_token" in data)) {
          const errMsg = "error" in data && typeof data.error === "string" ? data.error : undefined;
          throw new Error(errMsg ?? "Could not start reconnect");
        }
        sessionRef.current = {
          hookToken: data.hookToken,
          linkToken: data.link_token,
          runId: data.runId,
        };
        setPlaidToken(data.link_token);
      } else if (alert.source === "snaptrade") {
        const res = await snaptradeApi.generateConnectionPortal.$post({
          json: { broker: "", reconnectAuthorizationId: alert.sourceId },
        });
        const data = await res.json();
        if (!res.ok || !("redirectURI" in data) || !data.redirectURI) {
          const errMsg = "error" in data && typeof data.error === "string" ? data.error : undefined;
          throw new Error(errMsg ?? "Could not open reconnect");
        }
        window.open(data.redirectURI, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconnect failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <div className="flex items-center gap-2">
            <SheetTitle>Notifications</SheetTitle>
            {alerts.length > 0 ? <Badge variant="destructive">{alerts.length}</Badge> : null}
          </div>
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
            <ul className="flex flex-col gap-3 p-4">
              {alerts.map((alert) => {
                const meta = getAlertMetadata(alert);
                const isBusy = busyId === alert.id;
                return (
                  <li
                    className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
                    key={alert.id}
                  >
                    <div className="flex items-start gap-3">
                      {meta.institutionLogo || meta.institutionName ? (
                        <InstitutionLogo
                          className="size-10 shrink-0 overflow-hidden rounded-lg"
                          institutionLogo={meta.institutionLogo}
                          institutionName={meta.institutionName ?? null}
                          institutionUrl={null}
                        />
                      ) : (
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                          <HugeiconsIcon
                            className="size-5"
                            icon={AlertCircleIcon}
                            strokeWidth={2}
                          />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground text-sm">{alert.title}</div>
                        {alert.message ? (
                          <div className="mt-0.5 text-muted-foreground text-xs">
                            {alert.message}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      disabled={isBusy || !alert.sourceId}
                      onClick={() => handleReconnect(alert)}
                      size="sm"
                      type="button"
                      variant="default"
                    >
                      <HugeiconsIcon className="size-4" icon={RefreshIcon} strokeWidth={2} />
                      {isBusy ? "…" : getAlertCtaLabel(alert.type)}
                    </Button>
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
