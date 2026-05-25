import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AccountSetting01Icon,
  ArrowLeft02Icon,
  CreditCardIcon,
  EyeIcon,
  Key01Icon,
  UserCircle02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useLayoutEffect } from "react";

export const Route = createFileRoute("/_auth/settings")({
  component: SettingsLayout,
});

interface SettingsLink {
  to:
    | "/settings/profile"
    | "/settings/account"
    | "/settings/appearance"
    | "/settings/billing"
    | "/settings/api-keys";
  label: string;
  icon: IconSvgElement;
}

interface SettingsGroup {
  heading?: string;
  items: SettingsLink[];
}

const NAV_GROUPS: SettingsGroup[] = [
  {
    items: [
      { icon: UserCircle02Icon, label: "Profile", to: "/settings/profile" },
      { icon: AccountSetting01Icon, label: "Account", to: "/settings/account" },
      { icon: EyeIcon, label: "Appearance", to: "/settings/appearance" },
      { icon: CreditCardIcon, label: "Billing", to: "/settings/billing" },
    ],
  },
  {
    heading: "Developer",
    items: [{ icon: Key01Icon, label: "API keys", to: "/settings/api-keys" }],
  },
];

function SettingsLayout() {
  console.log("[settings] render", performance.now());
  // Flag `body[data-route="settings"]` atomically with this layout's first
  // commit. CSS in globals.css hides the app sidebar — by tying the flag
  // to mount (not URL change), the sidebar stays visible until settings
  // actually paints, so there's no momentary "sidebar collapses then
  // settings appears" flash.
  useLayoutEffect(() => {
    console.log("[settings] effect", performance.now());
    document.body.dataset.route = "settings";
    return () => {
      console.log("[settings] cleanup", performance.now());
      delete document.body.dataset.route;
    };
  }, []);

  return (
    <div className="flex h-svh min-h-0 w-full bg-background">
      <aside className="flex w-64 shrink-0 flex-col gap-1 border-border/60 border-r bg-muted/30 p-4">
        <Link
          className="mb-4 flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground text-sm transition-colors hover:bg-muted/60 hover:text-foreground"
          to="/home"
        >
          <HugeiconsIcon icon={ArrowLeft02Icon} size={15} strokeWidth={2} />
          Back to app
        </Link>

        {NAV_GROUPS.map((group, idx) => (
          // groups are static, order-stable; index key is fine
          <div className="flex flex-col gap-0.5" key={idx}>
            {group.heading && (
              <p className="mt-3 mb-1 px-2 py-1 font-medium text-muted-foreground text-xs uppercase tracking-widest">
                {group.heading}
              </p>
            )}
            {group.items.map((item) => (
              <Link
                activeProps={{
                  className: "bg-muted font-medium text-foreground",
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-muted-foreground text-sm transition-colors hover:bg-muted/60 hover:text-foreground",
                )}
                key={item.to}
                to={item.to}
              >
                <HugeiconsIcon
                  className="shrink-0"
                  icon={item.icon}
                  size={15}
                  strokeWidth={2}
                />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </aside>

      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-10 py-14">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
