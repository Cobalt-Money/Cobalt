import { env } from "@cobalt-web/env/web";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@cobalt-web/ui/components/alert-dialog";
import { Button } from "@cobalt-web/ui/components/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import { cobaltToast } from "../toasts";
import type { AccountCardViewModel } from "./lib/map-zero-to-account-cards";
import { useOptionalOnboardingHost } from "./onboarding-host";

interface AccountConnectionActionsProps {
  account: Pick<
    AccountCardViewModel,
    | "id"
    | "institution"
    | "institutionLogo"
    | "institutionLogosExtra"
    | "institutionUrl"
    | "kind"
    | "plaidAccountId"
    | "plaidItemId"
    | "snaptradeAuthorizationId"
    | "source"
  >;
}

interface ReauthSession {
  hookToken: string;
  runId: string;
  linkToken: string;
}

export function AccountConnectionActions({
  account,
}: AccountConnectionActionsProps) {
  const [plaidToken, setPlaidToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<"disconnect" | "reconnect" | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  // Active reauth session — holds the hookToken/runId from /link-token/update.
  // Cleared on success or exit so a stale session can't resolve a later flow.
  const sessionRef = useRef<ReauthSession | null>(null);
  const onboardingHost = useOptionalOnboardingHost();

  const onPlaidSuccess = useCallback(async () => {
    setPlaidToken(null);
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      return;
    }
    if (!onboardingHost) {
      // Component is rendered outside `<OnboardingHostContext.Provider>`.
      // No way to resolve the workflow; surface the error so the user knows.
      toast.error("Cannot finish reconnect — onboarding host not mounted");
      return;
    }
    try {
      // Resume the parked workflow — its reauth branch clears error state,
      // resolves alerts, and runs the full sync (accounts/tx/snapshots).
      await onboardingHost.resolveLink({
        hookToken: session.hookToken,
        publicToken: "reauth",
      });
      onboardingHost.startOnboarding(session.runId);
      cobaltToast.accountsUpdated({
        institution: account.institution,
        institutionLogo: account.institutionLogo,
        institutionLogosExtra: account.institutionLogosExtra,
        institutionUrl: account.institutionUrl,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not refresh connection"
      );
    }
  }, [
    account.institution,
    account.institutionLogo,
    account.institutionLogosExtra,
    account.institutionUrl,
    onboardingHost,
  ]);

  const onPlaidExit = useCallback(() => {
    setPlaidToken(null);
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!(session && onboardingHost)) {
      return;
    }
    // User abandoned reauth — terminate the parked workflow so the run
    // doesn't sit waiting until its hook expires.
    void (async () => {
      try {
        await onboardingHost.resolveLink({
          cancelled: true,
          hookToken: session.hookToken,
        });
      } catch {
        // Best-effort cleanup; server-side timeout is the fallback.
      }
    })();
  }, [onboardingHost]);

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    onExit: onPlaidExit,
    onSuccess: onPlaidSuccess,
    token: plaidToken,
  });

  useEffect(() => {
    if (plaidToken && plaidReady) {
      openPlaid();
    }
  }, [openPlaid, plaidReady, plaidToken]);

  const startBankReconnect = async () => {
    if (!account.plaidItemId) {
      return;
    }
    setBusy("reconnect");
    try {
      const res = await fetch(
        `${env.VITE_SERVER_URL}/api/plaid/link-token/update`,
        {
          body: JSON.stringify({
            mode: "reauth",
            plaidItemId: account.plaidItemId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconnect failed");
    } finally {
      setBusy(null);
    }
  };

  const startBrokerageReconnect = async () => {
    if (!account.snaptradeAuthorizationId) {
      return;
    }
    setBusy("reconnect");
    try {
      const res = await fetch(
        `${env.VITE_SERVER_URL}/api/snaptrade/generateConnectionPortal`,
        {
          body: JSON.stringify({
            broker: "",
            reconnectAuthorizationId: account.snaptradeAuthorizationId,
          }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );
      const data = (await res.json()) as {
        error?: string;
        redirectURI?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not open reconnect");
      }
      if (data.redirectURI) {
        window.location.assign(data.redirectURI);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconnect failed");
    } finally {
      setBusy(null);
    }
  };

  const handleReconnect = async () => {
    await (account.kind === "bank"
      ? startBankReconnect()
      : startBrokerageReconnect());
  };

  const performDisconnect = async () => {
    setBusy("disconnect");
    try {
      if (account.source === "manual") {
        const deleteFn = onboardingHost?.deleteManualAccount;
        if (!deleteFn) {
          throw new Error("Manual delete handler not wired");
        }
        await deleteFn(account.id);
        cobaltToast.accountDisconnected(account);
      } else if (account.kind === "bank") {
        if (!account.plaidAccountId) {
          throw new Error("Missing account id");
        }
        const res = await fetch(
          `${env.VITE_SERVER_URL}/api/accounts/bank/${encodeURIComponent(account.plaidAccountId)}`,
          { credentials: "include", method: "DELETE" }
        );
        const data = (await res.json()) as {
          message?: string;
          success?: boolean;
        };
        if (!res.ok || !data.success) {
          throw new Error(data.message ?? "Disconnect failed");
        }
        cobaltToast.accountDisconnected(account);
      } else {
        const res = await fetch(
          `${env.VITE_SERVER_URL}/api/accounts/brokerage/${encodeURIComponent(account.id)}`,
          { credentials: "include", method: "DELETE" }
        );
        if (res.status === 403) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? "Subscription required");
        }
        const data = (await res.json()) as {
          message?: string;
          success?: boolean;
        };
        if (!res.ok || data.success === false) {
          throw new Error(data.message ?? "Disconnect failed");
        }
        cobaltToast.accountDisconnected(account);
      }
      setDisconnectOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Disconnect failed");
    } finally {
      setBusy(null);
    }
  };

  const reconnectDisabled =
    account.kind === "bank"
      ? !account.plaidItemId
      : !account.snaptradeAuthorizationId;

  return (
    <>
      <Button
        className="h-auto justify-start px-0 py-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
        disabled={busy !== null || reconnectDisabled}
        onClick={async () => {
          await handleReconnect();
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        {busy === "reconnect" ? "…" : "Reconnect"}
      </Button>
      <Button
        className="h-auto justify-start px-0 py-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-destructive"
        disabled={busy !== null}
        onClick={() => {
          setDisconnectOpen(true);
        }}
        size="sm"
        type="button"
        variant="ghost"
      >
        {busy === "disconnect" ? "…" : "Disconnect"}
      </Button>

      <AlertDialog onOpenChange={setDisconnectOpen} open={disconnectOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the account from Cobalt. You can connect it again
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                await performDisconnect();
              }}
              size="sm"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
