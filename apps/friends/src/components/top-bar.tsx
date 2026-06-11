import { Avatar, AvatarFallback, AvatarImage } from "@cobalt-web/ui/components/avatar";
import { Dialog, DialogContent, DialogTitle } from "@cobalt-web/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { usePlaidLinkFlow } from "@cobalt-web/ui/cobalt/accounts/use-plaid-link-flow";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { plaidApi } from "../lib/api-client";
import { authClient } from "../lib/auth-client";
import { SettingsDialog } from "./settings-dialog";

type SettingsSection = "general" | "invites" | "friends";

/**
 * Floating glass top bar shown on the map. Replaces the bottom-left settings
 * chip from V1: brand on the left, "+ Add account" trigger and avatar menu
 * on the right. Avatar menu hosts the existing SettingsDialog so we keep
 * the modal UX intact while the chrome moves up.
 */
export function TopBar() {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const user = session.data?.user;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [signInOpen, setSignInOpen] = useState(false);
  const onGoogleSignIn = useCallback(async () => {
    await authClient.signIn.social({
      callbackURL: `${window.location.origin}/`,
      provider: "google",
    });
  }, []);
  const onAppleSignIn = useCallback(async () => {
    await authClient.signIn.social({
      callbackURL: `${window.location.origin}/`,
      provider: "apple",
    });
  }, []);
  const openSettings = useCallback((s: SettingsSection) => {
    setSettingsSection(s);
    setSettingsOpen(true);
  }, []);

  const { open: openPlaid, opening } = usePlaidLinkFlow({
    createLinkToken: async () => {
      const res = await plaidApi.createLinkToken.$post({ json: {} });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to start Plaid Link");
      }
      const data = await res.json();
      return { hookToken: data.hookToken, link_token: data.link_token };
    },
    onError: (msg) => toast.error(msg),
    onSuccess: () => toast.success("Account connected. Transactions syncing…"),
    resolveLink: async (args) => {
      const res = await plaidApi.resolveLink.$post({ json: args });
      if (!res.ok) {
        throw new Error("Failed to resolve Plaid Link");
      }
    },
  });

  const onSignOut = useCallback(async () => {
    await authClient.signOut();
    void navigate({ to: "/signin" });
  }, [navigate]);

  const initial = (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase();
  // Anon visitor on the landing demo network — no session. Swap profile +
  // add-account controls for sign-in CTAs so the same TopBar serves both
  // demo + authed flows.
  const isAnon = !session.isPending && !user;

  if (isAnon) {
    return (
      <>
        <div className="-translate-x-1/2 absolute top-4 left-1/2 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-zinc-700/40 px-2 py-1.5 text-white shadow-2xl shadow-black/50 backdrop-blur-md backdrop-saturate-150">
          <div className="flex items-baseline gap-1.5 px-3">
            <span className="text-sm font-medium tracking-wide">Pocketwatch</span>
            <a
              href="https://cobaltpf.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white/50 hover:text-white/80 transition"
            >
              by Cobalt
            </a>
          </div>
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="rounded-full bg-white px-3 py-1 text-sm font-medium text-black hover:bg-white/90"
          >
            Sign in
          </button>
        </div>
        <SignInDialog
          open={signInOpen}
          onOpenChange={setSignInOpen}
          onGoogleSignIn={onGoogleSignIn}
          onAppleSignIn={onAppleSignIn}
        />
      </>
    );
  }

  return (
    <>
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between gap-3 pointer-events-none">
        {/* Brand pill */}
        <div className="pointer-events-auto flex items-baseline gap-1.5 rounded-full border border-white/10 bg-zinc-700/55 px-4 py-1.5 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150">
          <span className="text-sm font-medium tracking-wide">Pocketwatch</span>
          <a
            href="https://cobaltpf.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-white/50 hover:text-white/80 transition"
          >
            by Cobalt
          </a>
        </div>

        <div className="flex items-center gap-2">
          {/* Add account pill */}
          <div className="pointer-events-auto rounded-full border border-white/10 bg-zinc-700/55 p-1 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150">
            <button
              type="button"
              onClick={openPlaid}
              disabled={opening}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/10 disabled:opacity-60"
            >
              <span>+</span>
              <span>{opening ? "Opening…" : "Add account"}</span>
            </button>
          </div>

          {/* Nav pill: invites / friends / settings */}
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-zinc-700/55 p-1 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl backdrop-saturate-150">
            <button
              type="button"
              onClick={() => openSettings("invites")}
              className="rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              Invites
            </button>
            <button
              type="button"
              onClick={() => openSettings("friends")}
              className="rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              Friends
            </button>
            <button
              type="button"
              onClick={() => openSettings("general")}
              className="rounded-full px-3 py-1 text-sm font-medium text-white/90 hover:bg-white/10"
            >
              Settings
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  className="pointer-events-auto rounded-full ring-1 ring-white/20 shadow-2xl shadow-black/50 transition hover:ring-white/40"
                />
              }
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                <AvatarFallback className="bg-zinc-700/60 text-[11px] text-white backdrop-blur-md">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  void onSignOut();
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <SettingsDialog
        initialSection={settingsSection}
        onOpenChange={setSettingsOpen}
        open={settingsOpen}
      />
    </>
  );
}

function SignInDialog({
  open,
  onOpenChange,
  onGoogleSignIn,
  onAppleSignIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="w-[90vw] max-w-sm gap-0 overflow-hidden border border-white/10 bg-zinc-700/40 p-0 text-white ring-1 ring-white/10 shadow-xl shadow-black/30 backdrop-blur-[8px] backdrop-saturate-[0.7] sm:max-w-sm"
        overlayClassName="bg-zinc-900/30 supports-backdrop-filter:backdrop-blur-[2px]"
      >
        <DialogTitle className="sr-only">Sign in</DialogTitle>
        <div className="flex flex-col gap-6 p-8 text-center">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold">Pocketwatch</h2>
            <p className="text-sm text-white/60">
              Find out where you are spending money in the city.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                void onGoogleSignIn();
              }}
              className="flex h-10 w-full items-center justify-center gap-3 rounded-xl bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90"
            >
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
              <span>Sign in with Google</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void onAppleSignIn();
              }}
              className="flex h-10 w-full items-center justify-center gap-3 rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:bg-black/90"
            >
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
              <span>Sign in with Apple</span>
            </button>
          </div>
          <p className="text-xs text-white/40">
            built with{" "}
            <a
              className="underline hover:text-white/70"
              href="https://better-auth.com"
              rel="noreferrer"
              target="_blank"
            >
              better-auth
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
