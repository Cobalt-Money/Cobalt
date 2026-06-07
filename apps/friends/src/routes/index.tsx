import { Navigate, createFileRoute } from "@tanstack/react-router";

import { FriendsMap } from "../components/map";
import { SettingsDialog } from "../components/settings-dialog";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/")({
  component: MapPage,
});

function MapPage() {
  const session = authClient.useSession();

  if (session.isPending) {
    return <FullscreenMessage text="Loading…" />;
  }

  if (!session.data?.user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <FriendsMap />
      <SettingsDialog initialSection="invites">
        <button
          type="button"
          aria-label="Settings"
          className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-md border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-medium text-white shadow-2xl shadow-black/50 backdrop-blur-md backdrop-saturate-150 hover:bg-black/40"
        >
          <span>⚙</span>
          <span>Settings</span>
        </button>
      </SettingsDialog>
    </div>
  );
}

function FullscreenMessage({ text }: { text: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <span className="text-muted-foreground text-sm">{text}</span>
    </div>
  );
}
