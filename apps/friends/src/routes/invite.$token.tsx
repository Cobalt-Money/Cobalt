import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/invite/$token")({
  component: RedeemInvitePage,
});

type Status =
  | { kind: "idle" }
  | { kind: "redeeming" }
  | { kind: "redirecting-to-signin" }
  | { kind: "accepted" }
  | { kind: "error"; message: string };

function RedeemInvitePage() {
  const { token } = Route.useParams();
  const session = authClient.useSession();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    if (session.isPending) {
      return;
    }
    if (status.kind !== "idle") {
      return;
    }

    void (async () => {
      setStatus({ kind: "redeeming" });
      const res = await authClient.invite.activate({ token });
      if (res.error) {
        setStatus({
          kind: "error",
          message: res.error.message ?? "Could not redeem invite",
        });
        return;
      }
      if (res.data?.accepted) {
        setStatus({ kind: "accepted" });
        setTimeout(() => navigate({ to: "/" }), 1200);
        return;
      }
      // Signed-out path — plugin set the cookie, send to sign-in
      setStatus({ kind: "redirecting-to-signin" });
      void authClient.signIn.social({
        callbackURL: `/invite/${token}`,
        provider: "google",
      });
    })();
  }, [navigate, session.isPending, status.kind, token]);

  if (session.data?.user && status.kind === "accepted") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">Cobalt Friends</h1>
        <Message status={status} />
      </div>
    </div>
  );
}

function Message({ status }: { status: Status }) {
  if (status.kind === "idle" || status.kind === "redeeming") {
    return <p className="text-muted-foreground text-sm">Redeeming invite…</p>;
  }
  if (status.kind === "redirecting-to-signin") {
    return <p className="text-muted-foreground text-sm">Sign in to accept this invite…</p>;
  }
  if (status.kind === "accepted") {
    return <p className="text-emerald-500 text-sm">You're now friends. Redirecting…</p>;
  }
  return <p className="text-red-500 text-sm">{status.message}</p>;
}
