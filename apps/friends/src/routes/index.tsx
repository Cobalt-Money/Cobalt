import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as z from "zod";

import { FriendsMap } from "../components/map";
import { OnboardingModal } from "../components/onboarding-modal";
import { TopBar } from "../components/top-bar";
import { authClient } from "../lib/auth-client";

const searchSchema = z.object({
  firstTime: z.boolean().optional(),
  inviteError: z.string().optional(),
  onboarding: z.string().optional(),
  welcomedBy: z.string().optional(),
});

export const Route = createFileRoute("/")({
  component: MapPage,
  validateSearch: searchSchema,
});

function MapPage() {
  const session = authClient.useSession();
  const { welcomedBy, firstTime, inviteError, onboarding } = Route.useSearch();
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

  // Anon visitors see the seeded demo network rather than a signin gate.
  // Zero swaps `ctx.userId` for DEMO_USER_ID server-side; same map UI works.
  // TopBar reads the same session and swaps profile menu → signin CTAs.
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <FriendsMap />
      <TopBar />
      {session.data?.user ? (
        <OnboardingGate
          force={onboarding === "1"}
          user={session.data.user as { isAnonymous?: boolean }}
        />
      ) : null}
    </div>
  );
}

const ONBOARDED_KEY = "friends.onboarded";

function OnboardingGate({ force, user }: { force: boolean; user: { isAnonymous?: boolean } }) {
  const [open, setOpen] = useState(() => {
    if (force) {
      return true;
    }
    if (user.isAnonymous) {
      return false;
    }
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(ONBOARDED_KEY) !== "1";
  });

  if (!open) {
    return null;
  }
  return (
    <OnboardingModal
      open={open}
      onClose={() => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(ONBOARDED_KEY, "1");
        }
        setOpen(false);
      }}
    />
  );
}

function FullscreenMessage({ text }: { text: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <span className="text-muted-foreground text-sm">{text}</span>
    </div>
  );
}
