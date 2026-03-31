import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import SocialAuth from "@/components/auth/social-auth";
import { useAppSession } from "@/lib/providers/app-session";
import { useOnReady } from "@/lib/providers/zero-client";

export const Route = createFileRoute("/")({
  component: SignInPage,
  staticData: { title: "Sign In" },
});

function SignInPage() {
  const session = useAppSession();
  const onReady = useOnReady();

  useEffect(() => {
    if (!session.isPending) {
      onReady();
    }
  }, [onReady, session.isPending]);

  if (session.isPending) {
    return null;
  }

  if (session.data) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center">
      <SocialAuth />
    </div>
  );
}
