import { env } from "@cobalt-web/env/web";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import SocialAuth from "@/components/auth/social-auth";
import { TryDemoButton } from "@/components/demo/try-demo-button";
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
      <div className="dark flex min-h-svh items-center justify-center bg-background">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (session.data) {
    return <Navigate replace to="/ai-chat" />;
  }

  /**
   * Login is brand-locked to the dark palette regardless of system theme — the
   * `.dark` scope flips `--background`, `--foreground`, etc. for everything
   * inside, so child components (like `SocialAuth`) auto-pick up dark tokens.
   */
  return (
    <div className="dark relative flex min-h-svh w-full flex-col bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] [background:radial-gradient(circle_at_25%_15%,white,transparent_55%)]"
      />

      <header className="relative flex items-center px-6 pt-8 sm:px-12 sm:pt-10">
        <span className="text-xl font-semibold tracking-tight">Cobalt</span>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <SocialAuth
            callbackURL={callbackURL}
            newUserCallbackURL={`${window.location.origin}/onboarding`}
          />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px w-12 bg-border" />
            <span>or</span>
            <span className="h-px w-12 bg-border" />
          </div>
          <TryDemoButton />
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Explore the full app with sample data. No account, no commitment.
          </p>
        </div>
      </main>
    </div>
  );
}
