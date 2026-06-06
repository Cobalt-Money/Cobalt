import { Navigate, createFileRoute } from "@tanstack/react-router";

import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

function SignInPage() {
  const session = authClient.useSession();

  if (session.data?.user) {
    return <Navigate to="/" replace />;
  }

  const onGoogleSignIn = async () => {
    await authClient.signIn.social({
      callbackURL: "/",
      provider: "google",
    });
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Cobalt Friends</h1>
          <p className="text-muted-foreground text-sm">See where your friends spend.</p>
        </div>
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="bg-foreground text-background hover:bg-foreground/90 w-full rounded-md px-4 py-2 text-sm font-medium transition"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
