import { Avatar, AvatarFallback, AvatarImage } from "@cobalt-web/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@cobalt-web/ui/components/dropdown-menu";
import { usePlaidLinkFlow } from "@cobalt-web/ui/cobalt/accounts/use-plaid-link-flow";
import { Link, useNavigate } from "@tanstack/react-router";
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
        <div className="h-5 w-px bg-white/15" />
        <Link
          to="/signin"
          className="rounded-full bg-white px-3 py-1 text-sm font-medium text-black hover:bg-white/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

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
        <div className="h-5 w-px bg-white/15" />
        <button
          type="button"
          onClick={openPlaid}
          disabled={opening}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium hover:bg-white/20 disabled:opacity-60"
        >
          <span>+</span>
          <span>{opening ? "Opening…" : "Add account"}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="Account menu"
                className="rounded-full ring-1 ring-white/20 transition hover:ring-white/40"
              />
            }
          >
            <Avatar className="h-7 w-7">
              <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
              <AvatarFallback className="bg-white/10 text-[11px] text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => openSettings("general")}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSettings("invites")}>Invites</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openSettings("friends")}>Friends</DropdownMenuItem>
            <DropdownMenuSeparator />
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
      <SettingsDialog
        initialSection={settingsSection}
        onOpenChange={setSettingsOpen}
        open={settingsOpen}
      />
    </>
  );
}
