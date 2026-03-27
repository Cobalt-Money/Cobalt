import { Button, buttonVariants } from "@cobalt-web/ui/components/button";
import { cn } from "@cobalt-web/ui/lib/utils";
import { useConnectionState, useZero } from "@rocicorp/zero/react";
import { Link } from "@tanstack/react-router";

/**
 * When the API returns 401/403 for Zero query or mutate, the client enters
 * `needs-auth`. Prompt the user to sign in again or reconnect (cookie auth).
 *
 * @see https://zero.rocicorp.dev/docs/auth#auth-failure-and-refresh
 */
export function ZeroNeedsAuthBanner() {
  const zero = useZero();
  const connectionState = useConnectionState();

  if (connectionState.name !== "needs-auth") {
    return null;
  }

  return (
    <div
      className="bg-destructive/15 text-destructive-foreground mb-4 rounded-md border border-destructive/40 px-4 py-3 text-sm"
      role="alert"
    >
      <p className="font-medium">Sync needs authentication</p>
      <p className="text-muted-foreground mt-1">
        Your session may have expired. Reconnect to resume syncing, or sign in
        again.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={async () => {
            try {
              await zero.connection.connect();
            } catch {
              // Reconnect is best-effort; user can retry or sign in again.
            }
          }}
        >
          Reconnect
        </Button>
        <Link
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          to="/"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
