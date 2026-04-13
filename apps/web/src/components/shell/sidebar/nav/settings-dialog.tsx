import { env } from "@cobalt-web/env/web";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@cobalt-web/ui/components/avatar";
import { Button } from "@cobalt-web/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@cobalt-web/ui/components/dialog";
import { Input } from "@cobalt-web/ui/components/input";
import { Separator } from "@cobalt-web/ui/components/separator";
import { Switch } from "@cobalt-web/ui/components/switch";
import { cn } from "@cobalt-web/ui/lib/utils";
import {
  CreditCardIcon,
  Notification03Icon,
  UserCircle02Icon,
  EyeIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/clients/auth-client";
import { useAppSession } from "@/lib/providers/app-session";

import { navUserInitials } from "./lib";

type Section = "profile" | "appearance" | "notifications" | "billing";

const NAV_SECTIONS: {
  id: Section;
  label: string;
  icon: IconSvgElement;
}[] = [
  { icon: UserCircle02Icon, id: "profile", label: "Profile" },
  { icon: EyeIcon, id: "appearance", label: "Appearance" },
  { icon: Notification03Icon, id: "notifications", label: "Notifications" },
  { icon: CreditCardIcon, id: "billing", label: "Billing" },
];

export function SettingsDialog({
  open,
  onOpenChange,
  defaultSection = "profile",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSection?: Section;
}) {
  const [activeSection, setActiveSection] = useState<Section>(defaultSection);
  const { data: session } = useAppSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user;
  const initials = navUserInitials(user?.name ?? "", user?.email ?? "");

  // Sync section when dialog opens to a new defaultSection
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setActiveSection(defaultSection);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <div className="flex h-[520px]">
          {/* Left nav */}
          <div className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-border/60 p-3 pt-4">
            <p className="mb-1 px-2 py-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Settings
            </p>
            {NAV_SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm transition-colors",
                  activeSection === section.id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <HugeiconsIcon
                  icon={section.icon}
                  size={15}
                  strokeWidth={2}
                  className="shrink-0"
                />
                {section.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="flex flex-1 flex-col overflow-y-auto p-6 pr-12">
            {activeSection === "profile" && (
              <ProfileSection user={user} initials={initials} />
            )}
            {activeSection === "appearance" && (
              <AppearanceSection theme={theme} setTheme={setTheme} />
            )}
            {activeSection === "notifications" && <NotificationsSection />}
            {activeSection === "billing" && <BillingSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
      <DialogTitle className="text-base font-semibold">Profile</DialogTitle>

      <div className="flex items-center gap-4">
        <Avatar className="size-14 rounded-2xl">
          <AvatarImage src={user?.image ?? ""} alt={user?.name} />
          <AvatarFallback className="rounded-2xl text-base">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{user?.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {user?.email}
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-name" className="text-sm font-medium">
            Display name
          </label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="settings-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="settings-email"
            type="email"
            value={user?.email ?? ""}
            disabled
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed here.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={saving || !name.trim() || name === user?.name}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
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
      <DialogTitle className="text-base font-semibold">Appearance</DialogTitle>

      <div className="flex flex-col gap-3">
        <SettingsRow
          label="Dark mode"
          description="Use dark color scheme across the app"
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

// ─── Notifications ────────────────────────────────────────────────────────────

function NotificationsSection() {
  return (
    <div className="flex flex-col gap-6">
      <DialogTitle className="text-base font-semibold">
        Notifications
      </DialogTitle>
      <p className="text-sm text-muted-foreground">
        Notification preferences coming soon.
      </p>
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
        const r = await fetch(`${env.VITE_SERVER_URL}/api/subscriptions`, {
          credentials: "include",
        });
        const data = (await r.json()) as {
          subscriptionSource: SubscriptionSource;
        };
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
      const res = await fetch(
        `${env.VITE_SERVER_URL}/api/subscriptions/billing-portal`,
        { credentials: "include", method: "POST" }
      );
      if (!res.ok) {
        throw new Error("Failed to open billing portal");
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setPortalError("Unable to open billing portal. Please try again.");
      setPortalLoading(false);
    }
  };

  let content: React.ReactNode;
  if (source === "loading") {
    content = <p className="text-sm text-muted-foreground">Loading…</p>;
  } else if (source === "stripe") {
    content = (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Manage your subscription, payment methods, and billing history through
          the Stripe customer portal.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={portalLoading}
          onClick={openBillingPortal}
        >
          <HugeiconsIcon icon={CreditCardIcon} size={15} strokeWidth={2} />
          {portalLoading ? "Opening…" : "Manage subscription"}
        </Button>
        {portalError && (
          <p className="text-xs text-destructive">{portalError}</p>
        )}
      </div>
    );
  } else if (source === "appstore") {
    content = (
      <p className="text-sm text-muted-foreground">
        Your subscription is managed through the App Store.
      </p>
    );
  } else {
    content = (
      <p className="text-sm text-muted-foreground">
        No active subscription found.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <DialogTitle className="text-base font-semibold">Billing</DialogTitle>
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
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
