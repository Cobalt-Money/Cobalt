import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@cobalt-web/ui/components/alert-dialog";
import { Button } from "@cobalt-web/ui/components/button";
import { Input } from "@cobalt-web/ui/components/input";
import { Alert02Icon, Delete02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { userApi } from "@/lib/clients/api-client";
import { authClient } from "@/lib/clients/auth-client";
import { deleteActiveZeroReplicaOnLogout } from "@/lib/zero-logout";

const CONFIRMATION_TEXT = "DELETE";

export function DeleteAccountDialog(_props: { userEmail?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const matches = confirmation === CONFIRMATION_TEXT;

  const handleOpenChange = (next: boolean) => {
    if (isDeleting) {
      return;
    }
    setOpen(next);
    if (!next) {
      setConfirmation("");
    }
  };

  const handleDelete = async () => {
    if (!matches) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await userApi.deleteAccount.$delete();

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to delete account");
      }

      toast.success(data.message);
      setOpen(false);

      // Server has already invalidated the session — these are best-effort
      // client-side cleanup. Redirect always happens, even if they throw.
      try {
        await authClient.signOut();
      } catch {
        // session likely already gone server-side
      }
      try {
        await deleteActiveZeroReplicaOnLogout();
      } catch {
        // local replica cleanup is non-critical
      }
      await router.navigate({ to: "/" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account. Please try again.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Delete account</p>
        <AlertDialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Delete
            </Button>
          }
        />
      </div>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
            Delete account permanently
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and all
            associated data:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Connected bank accounts (Plaid connections will be revoked)</li>
          <li>Connected brokerage accounts (SnapTrade authorizations will be revoked)</li>
          <li>Active Stripe subscriptions (cancelled immediately)</li>
          <li>Portfolio snapshots, transactions, and historical data</li>
          <li>Financial goals, chats, documents, and feedback</li>
          <li>All personal settings and preferences</li>
        </ul>

        <div className="flex flex-col gap-2">
          <label htmlFor="delete-account-confirm" className="text-sm font-medium text-foreground">
            Type <span className="font-mono font-semibold">{CONFIRMATION_TEXT}</span> to confirm
          </label>
          <Input
            id="delete-account-confirm"
            autoComplete="off"
            spellCheck={false}
            placeholder={CONFIRMATION_TEXT}
            className="font-mono"
            value={confirmation}
            disabled={isDeleting}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!matches || isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete account
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
