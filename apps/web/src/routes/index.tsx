import { createFileRoute, redirect } from "@tanstack/react-router";

import SocialAuth from "@/components/auth/social-auth";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: SignInPage,
  staticData: { title: "Sign In" },
});

function SignInPage() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <SocialAuth />
    </div>
  );
}
