import { createFileRoute, redirect } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/invite/$token")({
  /**
   * Loader-only route. Calls /invite/activate, then redirects:
   *   - signed-out + valid invite → Google OAuth (token sits in a signed
   *     cookie; the post-signup hook auto-redeems on callback)
   *   - signed-in + accepted     → "/" with ?welcomedBy=… so the home
   *     route can fire a toast
   *   - any error                → "/" with ?inviteError=… (toast the msg)
   *
   * Renders nothing — the redeem screen is transit, not a destination.
   */
  errorComponent: () => null,
  loader: async ({ params }) => {
    const res = await authClient.invite.activate({
      callbackURL: `/invite/${params.token}`,
      token: params.token,
    });

    if (res.error) {
      throw redirect({
        search: { inviteError: res.error.message ?? "Could not redeem invite" },
        to: "/",
      });
    }

    const data = res.data;

    if (!data?.accepted) {
      void authClient.signIn.social({
        callbackURL:
          typeof window === "undefined"
            ? `/invite/${params.token}`
            : `${window.location.origin}/invite/${params.token}`,
        provider: "google",
      });
      return null;
    }

    throw redirect({
      search: {
        firstTime: data.firstTime ?? true,
        welcomedBy: data.inviterName ?? "your friend",
      },
      to: "/",
    });
  },
  pendingComponent: () => (
    <div className="flex h-screen w-screen items-center justify-center">
      <span className="text-muted-foreground text-sm">Redeeming invite…</span>
    </div>
  ),
});
