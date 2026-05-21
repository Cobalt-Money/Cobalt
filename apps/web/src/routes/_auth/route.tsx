import { PrivacyProvider } from "@cobalt-web/ui/components/privacy";
import { SidebarProvider } from "@cobalt-web/ui/components/sidebar";
import { queries } from "@cobalt-web/zero";
import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";

import { OnboardingProgressProvider } from "@/components/accounts/onboarding-context";
import { OnboardingProgress } from "@/components/accounts/onboarding-progress";
import { DemoBanner } from "@/components/demo/demo-banner";
import { ImportWizardHost } from "@/components/imports/import-wizard";
import { AmbientInsetProvider } from "@/components/shell/ambient-inset-context";
import { CommandMenuProvider } from "@/components/shell/command-menu";
import { AppSidebar } from "@/components/shell/sidebar/app-sidebar";
import { SettingsDialogProvider } from "@/components/shell/sidebar/nav/settings-dialog-provider";
import { useAppSession } from "@/lib/providers/app-session";
import { ZeroProvider } from "@/lib/providers/zero-client";

/**
 * Auth + onboarding gating happens in `beforeLoad` reading router context that
 * AppSessionProvider mirrors from `useSession`. Component-level Navigate caused
 * a flash of protected content before the redirect committed; the TanStack
 * auth-and-guards skill calls that the "WRONG" pattern. Layout below is purely
 * presentational — provider tree only.
 *
 * SidebarProvider + AppSidebar live here (not inside each route layout) so that
 * the sidebar — including the profile avatar — is never unmounted during navigation.
 */
export const Route = createFileRoute("/_auth")({
  // Guard synchronously from router context (mirrored in AppSessionProvider).
  // - No session => bounce to landing.
  // - Real user without onboardedAt => force /onboarding (loop-skip when
  //   already there).
  // beforeLoad fires before the component renders so there is no flash of
  // protected content. Per TanStack auth-and-guards skill.
  beforeLoad: ({ context, location }) => {
    if (context.auth.isPending) {
      return;
    }
    const { user } = context.auth;
    if (!user) {
      throw redirect({ to: "/" });
    }
    if (!user.isAnonymous && !user.onboardedAt && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: AuthLayout,
  loader: ({ context }) => {
    context.zero?.run(queries.chats.list());
  },
});

function AuthShellWithOutlet({ chromeless, isDemo }: { chromeless: boolean; isDemo: boolean }) {
  // Setting `data-demo-banner` on this wrapper (vs `document.body` via an
  // effect) keeps the demo-mode flag in React tree — CSS in globals.css
  // targets `[data-demo-banner="1"] [data-slot="sidebar"]` etc. No effect,
  // no global DOM mutation.
  //
  // `chromeless` mode (used by /onboarding) keeps every provider — Zero, command
  // menu, settings — so child routes can still call useCommandMenu() and run
  // Zero queries, but hides the sidebar, demo banner, and account-connection
  // progress overlay so the onboarding flow renders edge-to-edge.
  return (
    <ZeroProvider>
      <OnboardingProgressProvider>
        <PrivacyProvider>
          <SettingsDialogProvider>
            <ImportWizardHost>
              <div
                className="flex h-svh min-h-0 flex-col overflow-hidden"
                data-demo-banner={isDemo ? "1" : undefined}
              >
                {chromeless ? (
                  // Onboarding mounts CommandMenuProvider so the Connect step
                  // can call `openAddAccount()` and launch the real Plaid flow
                  // without leaving the route. Sidebar + demo banner stay hidden.
                  <CommandMenuProvider>
                    <AmbientInsetProvider>
                      <Outlet />
                    </AmbientInsetProvider>
                  </CommandMenuProvider>
                ) : (
                  <CommandMenuProvider>
                    <DemoBanner />
                    <SidebarProvider className="min-h-0 flex-1">
                      <AppSidebar />
                      <AmbientInsetProvider>
                        <Outlet />
                      </AmbientInsetProvider>
                    </SidebarProvider>
                  </CommandMenuProvider>
                )}
              </div>
            </ImportWizardHost>
          </SettingsDialogProvider>
        </PrivacyProvider>
        <OnboardingProgress />
      </OnboardingProgressProvider>
    </ZeroProvider>
  );
}

function AuthLayout() {
  const session = useAppSession();
  const location = useLocation();
  const isOnboardingRoute = location.pathname === "/onboarding";

  // beforeLoad has already guaranteed session.data exists for non-pending case.
  // We still null-guard for the pending state because beforeLoad short-circuits
  // (returns undefined) while auth is loading.
  if (session.isPending || !session.data) {
    return null;
  }

  const user = session.data.user as { isAnonymous?: boolean };

  return <AuthShellWithOutlet chromeless={isOnboardingRoute} isDemo={Boolean(user.isAnonymous)} />;
}
