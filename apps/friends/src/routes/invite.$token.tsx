import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/invite/$token")({
  component: RedeemInvitePage,
  errorComponent: RedeemError,
  loader: async ({ params }) => {
    const res = await authClient.invite.activate({ token: params.token });
    if (res.error) {
      throw new Error(res.error.message ?? "Could not redeem invite");
    }
    return { accepted: res.data?.accepted ?? false, token: params.token };
  },
  pendingComponent: RedeemingPending,
});

function RedeemInvitePage() {
  const { accepted, token } = Route.useLoaderData();
  const session = authClient.useSession();
  const navigate = useNavigate();

  // Redirect home shortly after accept so the user lands on the feed.
  useEffect(() => {
    if (!accepted) {
      return;
    }
    const id = setTimeout(() => navigate({ to: "/" }), 1200);
    return () => clearTimeout(id);
  }, [accepted, navigate]);

  // Signed-out path: plugin set the redemption cookie server-side; bounce
  // through OAuth and TanStack Router re-runs the loader on return.
  if (!accepted && !session.isPending && !session.data?.user) {
    void authClient.signIn.social({
      callbackURL: `/invite/${token}`,
      provider: "google",
    });
    return <Shell>Sign in to accept this invite…</Shell>;
  }

  if (session.data?.user && accepted) {
    return <Navigate replace to="/" />;
  }

  return <Shell tone="success">You're now friends. Redirecting…</Shell>;
}

function RedeemingPending() {
  return <Shell>Redeeming invite…</Shell>;
}

function RedeemError({ error }: { error: Error }) {
  return <Shell tone="error">{error.message}</Shell>;
}

function Shell({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "success" | "error";
}) {
  const toneClass: Record<typeof tone, string> = {
    error: "text-red-500 text-sm",
    muted: "text-muted-foreground text-sm",
    success: "text-emerald-500 text-sm",
  };
  const className = toneClass[tone];
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">Cobalt Friends</h1>
        <p className={className}>{children}</p>
      </div>
    </div>
  );
}
