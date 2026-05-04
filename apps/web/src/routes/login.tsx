import { env } from "@cobalt-web/env/web";
import { Spinner } from "@cobalt-web/ui/components/spinner";
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
      return new URL(`/api/auth/oauth2/authorize${search}`, env.VITE_SERVER_URL).href;
    }
    return `${window.location.origin}/ai-chat`;
  }, []);

  if (session.isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (session.data) {
    return <Navigate replace to="/ai-chat" />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <SocialAuth callbackURL={callbackURL} />
    </div>
  );
}
