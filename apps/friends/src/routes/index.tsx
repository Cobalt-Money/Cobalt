import { Navigate, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import * as z from "zod";

import { FriendsMap } from "../components/map";
import { TopBar } from "../components/top-bar";
import { authClient } from "../lib/auth-client";

const searchSchema = z.object({
  firstTime: z.boolean().optional(),
  inviteError: z.string().optional(),
  welcomedBy: z.string().optional(),
});

export const Route = createFileRoute("/")({
  component: MapPage,
  validateSearch: searchSchema,
});

function MapPage() {
  const session = authClient.useSession();
  const { welcomedBy, firstTime, inviteError } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });

  // One-shot flash on mount: fire toast then strip the query params so a
  // refresh doesn't re-trigger it.
  useEffect(() => {
    if (!(welcomedBy || inviteError)) {
      return;
    }
    if (welcomedBy) {
      toast.success(
        firstTime === false
          ? `Already friends with ${welcomedBy}`
          : `You're now friends with ${welcomedBy}`,
      );
    } else if (inviteError) {
      toast.error(inviteError);
    }
    void navigate({ replace: true, search: {} });
  }, [welcomedBy, firstTime, inviteError, navigate]);

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
