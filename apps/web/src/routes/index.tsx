import { Navigate, createFileRoute } from "@tanstack/react-router";

import SocialAuth from "@/components/auth/social-auth";
import { useAppSession } from "@/lib/providers/app-session";

export const Route = createFileRoute("/")({
  component: SignInPage,
  staticData: { title: "Sign In" },
});

function SignInPage() {
  const session = useAppSession();

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
