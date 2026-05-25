import { Avatar, AvatarFallback, AvatarImage } from "@cobalt-web/ui/components/avatar";
import { Button } from "@cobalt-web/ui/components/button";
import { Input } from "@cobalt-web/ui/components/input";
import { Separator } from "@cobalt-web/ui/components/separator";
import { Switch } from "@cobalt-web/ui/components/switch";
import { useDemo } from "@cobalt-web/ui/hooks/use-demo";
import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { subscriptionsApi } from "@/lib/clients/api-client";
import { authClient } from "@/lib/clients/auth-client";

// ─── Profile ─────────────────────────────────────────────────────────────────

type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>["data"]>["user"];

export function ProfileSection({
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
      <h2 className="font-semibold text-base">Profile</h2>

      <div className="flex items-center gap-4">
        <Avatar className="size-14 rounded-2xl">
          <AvatarImage alt={user?.name} src={user?.image ?? ""} />
          <AvatarFallback className="rounded-2xl text-base">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium">{user?.name}</p>
          <p className="truncate text-muted-foreground text-sm">{user?.email}</p>
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
          <Input disabled id="settings-email" type="email" value={user?.email ?? ""} />
          <p className="text-muted-foreground text-xs">Email cannot be changed here.</p>
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

export function AccountSection({
  userEmail,
  isDemo,
}: {
  userEmail: string | undefined;
  isDemo: boolean;
}) {
  const { enter, exit, pending } = useDemo();
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-base">Account</h2>

      {/* Demo mode toggle — visible to everyone. Real users `Enter demo` to preview
          with sample data; demo users exit back to their real session via the
          banner exit too, surfaced here for discoverability. */}
      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium text-sm">Demo mode</p>
          <p className="text-muted-foreground text-xs">
            {isDemo
              ? "You're viewing sample data. Exit to return to your account."
              : "Preview Cobalt with sample data. Your real account stays untouched."}
          </p>
        </div>
        <Button
          disabled={pending}
          onClick={() => {
            void (isDemo ? exit() : enter());
          }}
          size="sm"
          variant={isDemo ? "default" : "outline"}
        >
          {isDemo ? "Exit demo" : "Enter demo"}
        </Button>
      </div>

      {isDemo ? (
        <p className="text-muted-foreground text-sm">
          Account management is disabled in demo mode. Sign up to manage your real account.
        </p>
      ) : (
        userEmail && <DeleteAccountDialog userEmail={userEmail} />
      )}
    </div>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────

export function AppearanceSection({
  theme,
  setTheme,
}: {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-base">Appearance</h2>

      <div className="flex flex-col gap-3">
        <SettingsRow description="Use dark color scheme across the app" label="Dark mode">
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

export function BillingSection() {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const { data: source = "loading" } = useQuery<SubscriptionSource | "loading">({
    queryFn: async () => {
      const res = await subscriptionsApi.index.$get();
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return "subscriptionSource" in data ? data.subscriptionSource : null;
    },
    queryKey: ["subscription-source"],
  });

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
          Manage your subscription, payment methods, and billing history through the Stripe customer
          portal.
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
        {portalError && <p className="text-destructive text-xs">{portalError}</p>}
      </div>
    );
  } else if (source === "appstore") {
    content = (
      <p className="text-muted-foreground text-sm">
        Your subscription is managed through the App Store.
      </p>
    );
  } else {
    content = <p className="text-muted-foreground text-sm">No active subscription found.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-base">Billing</h2>
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
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      {children}
    </div>
  );
}
