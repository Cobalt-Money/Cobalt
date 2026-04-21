import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cobalt-web/ui/components/avatar";
import { Button } from "@cobalt-web/ui/components/button";
import { DialogTitle } from "@cobalt-web/ui/components/dialog";
import { Input } from "@cobalt-web/ui/components/input";
import { Separator } from "@cobalt-web/ui/components/separator";
import { Switch } from "@cobalt-web/ui/components/switch";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  AccountSetting01Icon,
  CreditCardIcon,
  EyeIcon,
  UserCircle02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { navUserInitials } from "@/components/shell/sidebar/nav/lib";
import { subscriptionsApi } from "@/lib/clients/api-client";
import { authClient } from "@/lib/clients/auth-client";
import { useAppSession } from "@/lib/providers/app-session";

export type SettingsSection = "profile" | "account" | "appearance" | "billing";

const NAV_SECTIONS: {
  id: SettingsSection;
  label: string;
  icon: IconSvgElement;
}[] = [
  { icon: UserCircle02Icon, id: "profile", label: "Profile" },
  { icon: AccountSetting01Icon, id: "account", label: "Account" },
  { icon: EyeIcon, id: "appearance", label: "Appearance" },
  { icon: CreditCardIcon, id: "billing", label: "Billing" },
];

export interface SettingsGridProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  /** Compact mode shrinks padding for command-palette embedding. */
  compact?: boolean;
}

/**
 * Settings nav + section panels. No dialog wrapper. Used by both the
 * standalone Settings dialog and the cmd+k "settings" sub-page.
 */
export function SettingsGrid({
  activeSection,
  onSectionChange,
  compact = false,
}: SettingsGridProps) {
  const { data: session } = useAppSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user;
  const initials = navUserInitials(user?.name ?? "", user?.email ?? "");

  return (
    <div className="flex min-h-0 flex-1">
      {/* Left nav */}
      <div
        className={cn(
          "flex shrink-0 flex-col gap-0.5 border-border/60 border-r bg-muted/40",
          compact ? "w-40 p-2 pt-3" : "w-44 p-3 pt-4"
        )}
      >
        <p className="mb-1 px-2 py-1 font-medium text-muted-foreground text-xs uppercase tracking-widest">
          Settings
        </p>
        {NAV_SECTIONS.map((section) => (
          <button
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors",
              activeSection === section.id
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            type="button"
          >
            <HugeiconsIcon
              className="shrink-0"
              icon={section.icon}
              size={15}
              strokeWidth={2}
            />
            {section.label}
          </button>
        ))}
      </div>

      {/* Right content */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-y-auto",
          compact ? "p-5 pr-10" : "p-6 pr-12"
        )}
      >
        {activeSection === "profile" && (
          <ProfileSection initials={initials} user={user} />
        )}
        {activeSection === "account" && (
          <AccountSection userEmail={user?.email} />
        )}
        {activeSection === "appearance" && (
          <AppearanceSection setTheme={setTheme} theme={theme} />
        )}
        {activeSection === "billing" && <BillingSection />}
      </div>
    </div>
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

interface SessionUser {
  name: string;
  email: string;
  image?: string | null;
}

function ProfileSection({
  user,
  initials,
}: {
  user: SessionUser | null | undefined;
  initials: string;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name === user?.name) {
      return;
    }
    setSaving(true);
    try {
      await authClient.updateUser({ name: name.trim() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <DialogTitle className="font-semibold text-base">Profile</DialogTitle>

      <div className="flex items-center gap-4">
        <Avatar className="size-14 rounded-2xl">
          <AvatarImage alt={user?.name} src={user?.image ?? ""} />
          <AvatarFallback className="rounded-2xl text-base">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{user?.name}</p>
          <p className="truncate text-muted-foreground text-sm">
            {user?.email}
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-sm" htmlFor="settings-name">
            Display name
          </label>
          <Input
            id="settings-name"
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            value={name}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="font-medium text-sm" htmlFor="settings-email">
            Email
          </label>
          <Input
            disabled
            id="settings-email"
            type="email"
            value={user?.email ?? ""}
          />
          <p className="text-muted-foreground text-xs">
            Email cannot be changed here.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={saving || !name.trim() || name === user?.name}
          onClick={handleSave}
          size="sm"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── Account ─────────────────────────────────────────────────────────────────

function AccountSection({ userEmail }: { userEmail: string | undefined }) {
  return (
    <div className="flex flex-col gap-6">
      <DialogTitle className="font-semibold text-base">Account</DialogTitle>
      {userEmail && <DeleteAccountDialog userEmail={userEmail} />}
    </div>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearanceSection({
  theme,
  setTheme,
}: {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <DialogTitle className="font-semibold text-base">Appearance</DialogTitle>

      <div className="flex flex-col gap-3">
        <SettingsRow
          description="Use dark color scheme across the app"
          label="Dark mode"
        >
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </SettingsRow>
      </div>
    </div>
  );
}

// ─── Billing ─────────────────────────────────────────────────────────────────

type SubscriptionSource = "stripe" | "appstore" | null;

function BillingSection() {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [source, setSource] = useState<SubscriptionSource | "loading">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await subscriptionsApi.index.$get();
        const data = await res.json();
        if (!cancelled) {
          setSource(data.subscriptionSource);
        }
      } catch {
        if (!cancelled) {
          setSource(null);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await subscriptionsApi.billingPortal.$post();
      if (!res.ok) {
        throw new Error("Failed to open billing portal");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setPortalError("Unable to open billing portal. Please try again.");
      setPortalLoading(false);
    }
  };

  let content: React.ReactNode;
  if (source === "loading") {
    content = <p className="text-muted-foreground text-sm">Loading…</p>;
  } else if (source === "stripe") {
    content = (
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Manage your subscription, payment methods, and billing history through
          the Stripe customer portal.
        </p>
        <Button
          className="w-fit"
          disabled={portalLoading}
          onClick={openBillingPortal}
          size="sm"
          variant="outline"
        >
          <HugeiconsIcon icon={CreditCardIcon} size={15} strokeWidth={2} />
          {portalLoading ? "Opening…" : "Manage subscription"}
        </Button>
        {portalError && (
          <p className="text-destructive text-xs">{portalError}</p>
        )}
      </div>
    );
  } else if (source === "appstore") {
    content = (
      <p className="text-muted-foreground text-sm">
        Your subscription is managed through the App Store.
      </p>
    );
  } else {
    content = (
      <p className="text-muted-foreground text-sm">
        No active subscription found.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogTitle className="font-semibold text-base">Billing</DialogTitle>
      {content}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
