import { env } from "@cobalt-web/env/web";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import SocialAuth from "@/components/auth/social-auth";
import { useAppSession } from "@/lib/providers/app-session";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
  staticData: { title: "Login" },
});

function RouteComponent() {
  const session = useAppSession();

  const callbackURL = useMemo(() => {
    const { search } = window.location;
    const params = new URLSearchParams(search);
    if (params.get("response_type") && params.get("client_id")) {
      return new URL(`/api/auth/oauth2/authorize${search}`, env.VITE_SERVER_URL)
        .href;
    }
    return `${window.location.origin}/dashboard`;
  }, []);

  if (session.isPending) {
    return null;
  }

  if (session.data) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <SocialAuth callbackURL={callbackURL} />
    </div>
  );
}
