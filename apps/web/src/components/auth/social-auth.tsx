import { Button } from "@cobalt-web/ui/components/button";
import { ItemGroup } from "@cobalt-web/ui/components/item";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/clients/auth-client";

export default function SocialAuth({
  callbackURL: callbackURLProp,
  newUserCallbackURL,
  extras,
}: {
  callbackURL?: string;
  newUserCallbackURL?: string;
  extras?: ReactNode;
}) {
  const [loading, setLoading] = useState(false);

  const callbackURL =
    callbackURLProp ?? (typeof window === "undefined" ? "/home" : `${window.location.origin}/home`);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      await authClient.signIn.social(
        {
          callbackURL,
          newUserCallbackURL,
          provider: "google",
        },
        {
          onRequest: () => {
            setLoading(true);
          },
          onResponse: () => {
            setLoading(false);
          },
        },
      );
    } catch {
      toast.error("Failed to authenticate with Google. Please try again.");
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setLoading(true);
    try {
      await authClient.signIn.social(
        {
          callbackURL,
          newUserCallbackURL,
          provider: "apple",
        },
        {
          onRequest: () => {
            setLoading(true);
          },
          onResponse: () => {
            setLoading(false);
          },
        },
      );
    } catch {
      toast.error("Failed to authenticate with Apple. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="space-y-4">
        <ItemGroup className="flex w-full flex-col items-center space-y-2">
          <Button
            className="flex h-10 w-60 items-center justify-center gap-3 rounded-xl border-white bg-white px-4 text-sm text-black hover:bg-white/90 hover:text-black"
            disabled={loading}
            onClick={async () => {
              await handleGoogleAuth();
            }}
            type="button"
            variant="outline"
          >
            {loading ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <svg
                className="h-5 w-5"
                height="20"
                viewBox="0 0 256 262"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Google</title>
                <path
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  fill="#4285F4"
                />
                <path
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  fill="#34A853"
                />
                <path
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                  fill="#FBBC05"
                />
                <path
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  fill="#EB4335"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </Button>

          <Button
            className="flex h-10 w-60 items-center justify-center gap-3 rounded-xl border-black bg-black px-4 text-sm text-white hover:bg-black/90 hover:text-white"
            disabled={loading}
            onClick={async () => {
              await handleAppleAuth();
            }}
            type="button"
            variant="outline"
          >
            {loading ? (
              <Spinner className="h-5 w-5 text-white" />
            ) : (
              <svg
                className="h-5 w-5"
                fill="currentColor"
                height="20"
                viewBox="0 0 24 24"
                width="20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Apple</title>
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
            <span>Sign in with Apple</span>
          </Button>
        </ItemGroup>

        {extras}

        <p className="text-center text-muted-foreground text-xs">
          By continuing, you agree to our{" "}
          <a className="underline underline-offset-4" href="/terms">
            Terms
          </a>{" "}
          and{" "}
          <a className="underline underline-offset-4" href="/privacy">
            Privacy Policy
          </a>
          .
        </p>

        <p className="text-center text-muted-foreground text-xs">
          built with{" "}
          <a
            className="cursor-pointer underline dark:text-white/70"
            href="https://better-auth.com"
            rel="noreferrer"
            target="_blank"
          >
            better-auth
          </a>
        </p>
      </div>
    </div>
  );
}
