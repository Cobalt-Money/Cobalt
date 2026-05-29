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
import { cobaltToast } from "@cobalt-web/ui/cobalt/toasts";
import type { AccountCardViewModel } from "@cobalt-web/ui/cobalt/accounts/lib/map-zero-to-account-cards";
import { useOptionalOnboardingHost } from "@cobalt-web/ui/cobalt/accounts/onboarding-host";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import { accountsApi, plaidApi, snaptradeApi } from "@/lib/clients/api-client";

import type { ReauthSession } from "./reauth-session";

async function disconnectAccountRest(accountId: string | null | undefined) {
  if (!accountId) {
    throw new Error("Missing account id");
  }
  const res = await accountsApi[":id"].$delete({
    param: { id: accountId },
  });
  const data = await res.json();
  if (res.status === 403) {
    const errMsg = "error" in data && typeof data.error === "string" ? data.error : undefined;
    throw new Error(errMsg ?? "Subscription required");
  }
  if (!res.ok || !("success" in data) || !data.success) {
    const msg = "message" in data ? data.message : undefined;
    throw new Error(msg ?? "Disconnect failed");
  }
}

interface AccountConnectionActionsProps {
  account: Pick<
    AccountCardViewModel,
    | "id"
    | "institution"
    | "institutionLogo"
    | "institutionLogosExtra"
    | "institutionUrl"
    | "kind"
    | "plaidItemId"
    | "snaptradeAuthorizationId"
    | "source"
  >;
}

export function AccountConnectionActions({ account }: AccountConnectionActionsProps) {
  const [plaidToken, setPlaidToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<"disconnect" | "reconnect" | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  // Active reauth session — holds the hookToken/runId from /linkToken/update.
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
      toast.error("Cannot finish reconnect — onboarding host not mounted");
      return;
    }
    try {
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
      toast.error(error instanceof Error ? error.message : "Could not refresh connection");
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
      const res = await plaidApi.linkToken.update.$post({
        json: { mode: "reauth", plaidItemId: account.plaidItemId },
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
      const res = await snaptradeApi.generateConnectionPortal.$post({
        json: {
          broker: "",
          reconnectAuthorizationId: account.snaptradeAuthorizationId,
        },
      });
      const data = await res.json();
      if (!res.ok || !("redirectURI" in data)) {
        const errMsg = "error" in data && typeof data.error === "string" ? data.error : undefined;
        throw new Error(errMsg ?? "Could not open reconnect");
      }
      window.open(data.redirectURI, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reconnect failed");
    } finally {
      setBusy(null);
    }
  };

  const handleReconnect = async () => {
    await (account.kind === "bank" ? startBankReconnect() : startBrokerageReconnect());
  };

  const performDisconnect = async () => {
    setBusy("disconnect");
    try {
      await disconnectAccountRest(account.id);
      cobaltToast.accountDisconnected(account);
      setDisconnectOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Disconnect failed");
    } finally {
      setBusy(null);
    }
  };

  const reconnectDisabled =
    account.kind === "bank" ? !account.plaidItemId : !account.snaptradeAuthorizationId;

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
              This removes the account and all its transactions from Cobalt
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
