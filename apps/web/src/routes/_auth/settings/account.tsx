import { createFileRoute } from "@tanstack/react-router";

import { AccountSection } from "@/components/settings/sections";
import { useAppSession } from "@/lib/providers/app-session";

export const Route = createFileRoute("/_auth/settings/account")({
  component: AccountRoute,
});

function AccountRoute() {
  const { data: session } = useAppSession();
  const user = session?.user as { email?: string; isAnonymous?: boolean } | undefined;
  return <AccountSection isDemo={Boolean(user?.isAnonymous)} userEmail={user?.email} />;
}
