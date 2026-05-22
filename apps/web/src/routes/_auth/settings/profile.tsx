import { createFileRoute } from "@tanstack/react-router";

import { ProfileSection } from "@/components/settings/sections";
import { navUserInitials } from "@/components/shell/sidebar/nav/lib";
import { useAppSession } from "@/lib/providers/app-session";

export const Route = createFileRoute("/_auth/settings/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  const { data: session } = useAppSession();
  const user = session?.user;
  const initials = navUserInitials(user?.name ?? "", user?.email ?? "");
  return <ProfileSection initials={initials} user={user} />;
}
