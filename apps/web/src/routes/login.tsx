import { createFileRoute } from "@tanstack/react-router";

import SocialAuth from "@/components/auth/social-auth";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto mt-10 w-full max-w-md p-6">
      <SocialAuth />
    </div>
  );
}
