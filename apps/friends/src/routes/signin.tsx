import { Navigate, createFileRoute } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

async function onGoogleSignIn() {
  await authClient.signIn.social({
    callbackURL: typeof window === "undefined" ? "/" : `${window.location.origin}/`,
    provider: "google",
  });
}

function SignInPage() {
  const session = authClient.useSession();

  if (session.data?.user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">Pocketwatch</h1>
          <p className="text-muted-foreground text-base">See where your friends spend.</p>
        </div>
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-md px-4 py-2 text-base font-medium transition"
        >
          Continue with Google
        </button>
        <p className="text-muted-foreground text-center text-sm">Powered by Cobalt</p>
      </div>
    </div>
  );
}
