import { env } from "@cobalt-web/env/web";
import { Button, buttonVariants } from "@cobalt-web/ui/components/button";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { cn } from "@cobalt-web/ui/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useOnReady } from "@/lib/providers/zero-client";

export const Route = createFileRoute("/oauth/consent")({
  component: RouteComponent,
  staticData: { title: "Authorize application" },
});

/** Better Auth returns `{ redirect, url }`; OpenAPI documents `redirect_uri`. */
function pickRedirectUrlFromConsentResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const o = data as Record<string, unknown>;
  const top = o.redirect_uri ?? o.redirectUrl ?? o.url;
  if (typeof top === "string" && top.length > 0) {
    return top;
  }
  const inner = o.data;
  if (inner && typeof inner === "object") {
    const d = inner as Record<string, unknown>;
    const nested = d.redirect_uri ?? d.redirectUrl ?? d.url;
    if (typeof nested === "string" && nested.length > 0) {
      return nested;
    }
  }
  return null;
}

/**
 * After `await fetch()`, user activation is gone; many browsers block
 * `window.location` to custom schemes (e.g. `cursor://`). We still try
 * assign/replace, and always show a same-document `<a href>` fallback.
 */
function tryNavigateToClient(url: string): void {
  try {
    window.location.assign(url);
  } catch {
    // ignore — fallback link below
  }
}

function RouteComponent() {
  const onReady = useOnReady();
  const [status, setStatus] = useState<
    "idle" | "submitting" | "redirect" | "error"
  >("idle");
  /** Which action is in flight — drives the post-click message before redirect. */
  const [pendingIntent, setPendingIntent] = useState<"allow" | "deny" | null>(
    null
  );
  /** Set when consent API succeeded; used for reliable `cursor://` handoff. */
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onReady();
  }, [onReady]);

  const oauthQuery = useMemo(
    () => window.location.search.replace(/^\?/, ""),
    []
  );

  const clientId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("client_id");
  }, []);

  const requestedScope = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("scope");
  }, []);

  const postConsent = useCallback(
    async (accept: boolean) => {
      if (!oauthQuery) {
        setErrorMessage("Missing oauth query. Restart the sign-in flow.");
        setStatus("error");
        setPendingIntent(null);
        return;
      }
      setPendingIntent(accept ? "allow" : "deny");
      setStatus("submitting");
      setErrorMessage(null);
      setRedirectUrl(null);
      const url = new URL("/api/auth/oauth2/consent", env.VITE_SERVER_URL).href;
      let res: Response;
      try {
        res = await fetch(url, {
          body: JSON.stringify({ accept, oauth_query: oauthQuery }),
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
      } catch {
        setErrorMessage(
          "Could not reach the server (network or CORS). Check that the API is running and CORS allows this origin."
        );
        setStatus("error");
        setPendingIntent(null);
        return;
      }
      if (!res.ok) {
        setErrorMessage("Could not complete authorization. Try again.");
        setStatus("error");
        setPendingIntent(null);
        return;
      }
      let raw: unknown;
      try {
        raw = await res.json();
      } catch {
        setErrorMessage("Invalid response from server.");
        setStatus("error");
        setPendingIntent(null);
        return;
      }
      const next = pickRedirectUrlFromConsentResponse(raw);
      if (!next) {
        setErrorMessage("Unexpected response from server (no redirect URL).");
        setStatus("error");
        setPendingIntent(null);
        return;
      }
      setRedirectUrl(next);
      setStatus("redirect");
      setPendingIntent(null);
      tryNavigateToClient(next);
    },
    [oauthQuery]
  );

  const consentPanel = (): ReactNode => {
    if (status === "submitting") {
      return (
        <div
          aria-live="polite"
          className="flex flex-col items-center gap-4 py-4"
        >
          <Spinner className="size-8" />
          <p className="text-foreground text-sm font-medium">
            {pendingIntent === "allow"
              ? "Redirecting to finish signing in…"
              : "Returning to the application…"}
          </p>
          <p className="text-muted-foreground text-xs">
            You can close this tab if nothing happens after a few seconds.
          </p>
        </div>
      );
    }
    if (status === "redirect" && redirectUrl) {
      return (
        <div
          aria-live="polite"
          className="flex flex-col items-center gap-4 py-4"
        >
          <p className="text-foreground text-lg font-semibold">
            Authorization complete
          </p>
          <p className="text-muted-foreground text-sm">
            Browsers often block automatic handoff to desktop apps (cursor://,
            etc.). Click below to return to your client — a normal link is
            always allowed.
          </p>
          <a
            className={cn(
              buttonVariants({ size: "lg", variant: "default" }),
              "inline-flex w-full max-w-sm justify-center no-underline"
            )}
            href={redirectUrl}
            rel="noopener noreferrer"
          >
            Continue to application
          </a>
        </div>
      );
    }
    return (
      <>
        <h1 className="text-xl font-semibold">Authorize access</h1>
        <p className="text-muted-foreground text-sm">
          An application requested access to your Cobalt account. Allow only if
          you started this request from a trusted AI tool.
        </p>
        {clientId ? (
          <p className="text-muted-foreground text-sm">Client: {clientId}</p>
        ) : null}
        {requestedScope ? (
          <p className="text-muted-foreground text-sm">
            Requested scopes: {requestedScope}
          </p>
        ) : null}
        {oauthQuery ? null : (
          <p className="text-destructive text-sm">Missing oauth query.</p>
        )}
        {errorMessage ? (
          <p className="text-destructive text-sm">{errorMessage}</p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            disabled={!oauthQuery}
            onClick={async () => {
              await postConsent(true);
            }}
            type="button"
          >
            Allow
          </Button>
          <Button
            disabled={!oauthQuery}
            onClick={async () => {
              await postConsent(false);
            }}
            type="button"
            variant="outline"
          >
            Deny
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="bg-background flex h-14 shrink-0 items-center border-b px-4 lg:px-6">
        <Link className="text-base font-medium" to="/">
          Cobalt
        </Link>
      </header>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-auto p-6">
        <div className="max-w-md space-y-4 text-center">{consentPanel()}</div>
      </main>
    </div>
  );
}
