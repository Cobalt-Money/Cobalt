import { env } from "@cobalt-web/env/web";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { Link, Navigate, createFileRoute } from "@tanstack/react-router";
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
    <div className="dark relative flex min-h-svh w-full flex-col overflow-hidden bg-background text-foreground">
      <video
        aria-hidden
        autoPlay
        className="pointer-events-none absolute inset-0 size-full object-cover"
        loop
        muted
        playsInline
      >
        <source src="/auth/videos/nyc-skyline.mp4" type="video/mp4" />
      </video>

      <aside className="relative z-10 flex h-svh w-full flex-col border-r border-white/15 bg-white/10 text-white backdrop-blur-sm backdrop-saturate-150 shadow-2xl sm:max-w-md">
        <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="flex w-full flex-col items-center gap-6">
            <Link className="flex items-center gap-2 text-white hover:opacity-90" to="/">
              <img alt="" aria-hidden className="size-6" src="/favicon.svg" />
              <span className="text-xl font-medium">Cobalt</span>
            </Link>
            <SocialAuth
              callbackURL={callbackURL}
              extras={
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3 text-xs text-white/70">
                    <span className="h-px w-12 bg-white/30" />
                    <span>or</span>
                    <span className="h-px w-12 bg-white/30" />
                  </div>
                  <TryDemoButton className="h-10 w-60 rounded-xl px-4 text-sm" />
                </div>
              }
              newUserCallbackURL={`${window.location.origin}/onboarding`}
            />
          </div>
        </main>
      </aside>
    </div>
  );
}
