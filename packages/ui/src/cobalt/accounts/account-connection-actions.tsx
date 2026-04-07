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
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { toast } from "sonner";

import type { AccountCardViewModel } from "./lib/map-zero-to-account-cards";

interface AccountConnectionActionsProps {
  account: Pick<
    AccountCardViewModel,
    | "id"
    | "kind"
    | "plaidAccountId"
    | "plaidItemId"
    | "snaptradeAuthorizationId"
  >;
}

export function AccountConnectionActions({
  account,
}: AccountConnectionActionsProps) {
  const [plaidToken, setPlaidToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<"disconnect" | "reconnect" | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const onPlaidSuccess = useCallback(() => {
    setPlaidToken(null);
    toast.success("Bank connection updated");
  }, []);

  const { open: openPlaid, ready: plaidReady } = usePlaidLink({
    onExit: () => {
      setPlaidToken(null);
    },
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
        link_token?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start reconnect");
      }
      if (!data.link_token) {
        throw new Error("No link token");
      }
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
        `${env.VITE_SERVER_URL}/api/snaptrade/generate-connection-portal`,
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
      if (account.kind === "bank") {
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
        toast.success(data.message ?? "Disconnected");
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
        toast.success(data.message ?? "Disconnected");
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
