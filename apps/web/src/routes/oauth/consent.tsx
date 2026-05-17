import { env } from "@cobalt-web/env/web";
import { Alert, AlertDescription, AlertTitle } from "@cobalt-web/ui/components/alert";
import { Button } from "@cobalt-web/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@cobalt-web/ui/components/card";
import { Separator } from "@cobalt-web/ui/components/separator";
import { Spinner } from "@cobalt-web/ui/components/spinner";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  SecurityCheckIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

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

const SCOPE_LABELS: Record<string, string> = {
  email: "Read your email address",
  offline_access: "Stay signed in (refresh tokens)",
  openid: "Verify your identity",
  profile: "Read your basic profile",
};

function describeScope(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

interface PublicClient {
  client_id: string;
  client_name?: string | null;
  client_uri?: string | null;
  logo_uri?: string | null;
}

async function fetchPublicClient(clientId: string): Promise<PublicClient | null> {
  const url = new URL("/api/auth/oauth2/public-client", env.VITE_SERVER_URL);
  url.searchParams.set("client_id", clientId);
  const res = await fetch(url.href, { credentials: "include" });
  if (!res.ok) {
    return null;
  }
  return (await res.json()) as PublicClient;
}

function ClientCard({
  clientId,
  isPending,
  client,
}: {
  clientId: string;
  isPending: boolean;
  client: PublicClient | null;
}) {
  const displayName = client?.client_name?.trim() || clientId;
  const initial = displayName.slice(0, 1).toUpperCase();
  return (
    <div className="bg-muted/50 ring-foreground/10 flex items-center gap-3 rounded-lg p-3 ring-1">
      <div className="bg-background ring-foreground/10 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1">
        {client?.logo_uri ? (
          <img alt="" className="size-full object-cover" src={client.logo_uri} />
        ) : (
          <span className="font-medium text-sm">{initial}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">Application</p>
        {isPending ? (
          <p className="bg-muted h-4 w-32 animate-pulse rounded" />
        ) : (
          <p className="truncate font-medium text-sm">{displayName}</p>
        )}
        {client?.client_uri ? (
          <a
            className="text-muted-foreground block truncate text-xs underline-offset-4 hover:underline"
            href={client.client_uri}
            rel="noreferrer"
            target="_blank"
          >
            {client.client_uri}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ScopeList({ scopes }: { scopes: string[] }) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
        This app will be able to
      </p>
      <ul className="space-y-2">
        {scopes.map((scope) => (
          <li className="flex items-start gap-2 text-sm" key={scope}>
            <HugeiconsIcon
              className="text-foreground/70 mt-0.5 shrink-0"
              icon={CheckmarkCircle02Icon}
              size={16}
            />
            <div className="min-w-0">
              <span>{describeScope(scope)}</span>
              <code className="text-muted-foreground ml-1.5 text-xs">{scope}</code>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RouteComponent() {
  const [status, setStatus] = useState<"idle" | "submitting" | "redirect" | "error">("idle");
  /** Which action is in flight — drives the post-click message before redirect. */
  const [pendingIntent, setPendingIntent] = useState<"allow" | "deny" | null>(null);
  /** Set when consent API succeeded; used for reliable `cursor://` handoff. */
  const [_redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [completedIntent, setCompletedIntent] = useState<"allow" | "deny" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const oauthQuery = useMemo(() => window.location.search.replace(/^\?/, ""), []);

  const clientId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("client_id");
  }, []);

  const clientQuery = useQuery({
    enabled: !!clientId,
    queryFn: () => fetchPublicClient(clientId as string),
    queryKey: ["oauth-public-client", clientId],
    staleTime: 5 * 60 * 1000,
  });
  const client = clientQuery.data ?? null;

  const scopes = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("scope");
    if (!raw) {
      return [];
    }
    return raw.split(/\s+/).filter(Boolean);
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
          "Could not reach the server (network or CORS). Check that the API is running and CORS allows this origin.",
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
      setCompletedIntent(accept ? "allow" : "deny");
      setRedirectUrl(next);
      setStatus("redirect");
      setPendingIntent(null);
      tryNavigateToClient(next);
    },
    [oauthQuery],
  );

  const isAllowDone = status === "redirect" && completedIntent === "allow";
  const isDenyDone = status === "redirect" && completedIntent === "deny";
  const isDone = status === "redirect";
  const isSubmitting = status === "submitting";

  const allowButtonLabel = (): ReactNode => {
    if (isSubmitting && pendingIntent === "allow") {
      return (
        <>
          <Spinner className="size-4" />
          Authorizing…
        </>
      );
    }
    if (isAllowDone) {
      return (
        <>
          <HugeiconsIcon className="size-4" icon={Tick02Icon} />
          Authorized — return to your app
        </>
      );
    }
    return "Allow access";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="bg-background flex h-14 shrink-0 items-center border-b px-4 lg:px-6">
        <Link className="text-base font-medium" to="/">
          Cobalt
        </Link>
      </header>
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-4 sm:p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <div className="bg-foreground/5 ring-foreground/10 mx-auto flex size-12 items-center justify-center rounded-full ring-1">
              <HugeiconsIcon className="text-foreground" icon={SecurityCheckIcon} size={24} />
            </div>
            <CardTitle className="text-lg">Authorize access to Cobalt</CardTitle>
            <CardDescription>
              An external application wants to connect to your Cobalt account. Only continue if you
              started this request from a trusted tool.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {clientId ? (
              <ClientCard client={client} clientId={clientId} isPending={clientQuery.isPending} />
            ) : null}

            {scopes.length > 0 ? <ScopeList scopes={scopes} /> : null}

            <Separator />

            <Alert>
              <HugeiconsIcon icon={Alert02Icon} size={16} />
              <AlertTitle>Only allow trusted applications</AlertTitle>
              <AlertDescription>
                You can revoke access at any time from your Cobalt settings.
              </AlertDescription>
            </Alert>

            {oauthQuery ? null : <p className="text-destructive text-sm">Missing oauth query.</p>}
            {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
            {isDenyDone ? (
              <p className="text-muted-foreground text-sm">
                Access denied. You can close this window.
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {isDone ? null : (
              <Button
                className="w-full sm:w-auto"
                disabled={!oauthQuery || isSubmitting}
                onClick={async () => {
                  await postConsent(false);
                }}
                type="button"
                variant="outline"
              >
                {isSubmitting && pendingIntent === "deny" ? (
                  <>
                    <Spinner className="size-4" />
                    Denying…
                  </>
                ) : (
                  "Deny"
                )}
              </Button>
            )}
            <Button
              className={cn(
                "w-full sm:w-auto",
                isAllowDone && "bg-green-600 hover:bg-green-600 pointer-events-none",
              )}
              disabled={!oauthQuery || isSubmitting || isDenyDone}
              onClick={async () => {
                await postConsent(true);
              }}
              type="button"
            >
              {allowButtonLabel()}
            </Button>
          </CardFooter>
        </Card>

        <p className="text-muted-foreground mt-4 text-center text-xs">
          By continuing you agree to our{" "}
          <Link className="underline underline-offset-4" to="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="underline underline-offset-4" to="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
