import { Navigate, createFileRoute } from "@tanstack/react-router";

import { FriendsMap } from "../components/map";
import { TopBar } from "../components/top-bar";
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
      <TopBar />
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
