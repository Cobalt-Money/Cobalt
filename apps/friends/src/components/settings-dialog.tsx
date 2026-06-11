import { mutators, queries } from "@cobalt-web/zero";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@cobalt-web/ui/components/dialog";
import { usePlaidLinkFlow } from "@cobalt-web/ui/cobalt/accounts/use-plaid-link-flow";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  BankIcon,
  EarthIcon,
  Mail01Icon,
  Settings02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { authClient } from "../lib/auth-client";
import { accountsApi, plaidApi, userApi } from "../lib/api-client";

type Section = "general" | "invites" | "friends" | "sharing" | "accounts";

interface ShareSettings {
  shareAmount: boolean;
  shareCard: boolean;
  shareDate: boolean;
  shareMaxAmountCents: number | null;
  shareMerchant: boolean;
  shareMinAmountCents: number | null;
  shareNote: boolean;
}

const DEFAULT_SHARE: ShareSettings = {
  shareAmount: true,
  shareCard: true,
  shareDate: true,
  shareMaxAmountCents: null,
  shareMerchant: true,
  shareMinAmountCents: null,
  shareNote: false,
};

interface SettingsDialogProps {
  /** Optional trigger element. Omit when controlled via `open`/`onOpenChange`. */
  children?: React.ReactNode;
  /** Optional initial section the dialog opens on. */
  initialSection?: Section;
  /** Controlled open state (use w/ `onOpenChange`). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const NAV_ITEMS: { id: Section; label: string; icon: IconSvgElement }[] = [
  { icon: Settings02Icon, id: "general", label: "General" },
  { icon: BankIcon, id: "accounts", label: "Accounts" },
  { icon: Mail01Icon, id: "invites", label: "Invites" },
  { icon: UserGroupIcon, id: "friends", label: "Friends" },
  { icon: EarthIcon, id: "sharing", label: "Sharing" },
];

export function SettingsDialog({
  children,
  initialSection = "general",
  open: openProp,
  onOpenChange,
}: SettingsDialogProps) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [section, setSection] = useState<Section>(initialSection);
  // React docs pattern: adjust state during render in response to prop change.
  // Re-sync `section` when a controlled caller bumps `initialSection` while open.
  const [prevSync, setPrevSync] = useState({ initialSection, open });
  if (prevSync.open !== open || prevSync.initialSection !== initialSection) {
    setPrevSync({ initialSection, open });
    if (open) {
      setSection(initialSection);
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      {children ? <DialogTrigger render={children as React.ReactElement} /> : null}
      <DialogContent
        className="h-[90vh] max-h-[720px] w-[95vw] max-w-3xl gap-0 overflow-hidden border border-white/10 bg-zinc-700/40 p-0 text-white ring-1 ring-white/10 shadow-xl shadow-black/30 backdrop-blur-[8px] backdrop-saturate-[0.7] sm:h-[80vh] sm:w-[90vw] sm:max-w-3xl"
        overlayClassName="bg-zinc-900/30 supports-backdrop-filter:backdrop-blur-[2px]"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex h-full min-h-0">
          <Sidebar active={section} onSelect={setSection} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0">
            {section === "general" && <GeneralSection />}
            {section === "accounts" && <AccountsSection />}
            {section === "invites" && <InvitesSection />}
            {section === "friends" && <FriendsSection />}
            {section === "sharing" && <SharingSection />}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Sidebar({ active, onSelect }: { active: Section; onSelect: (s: Section) => void }) {
  return (
    <nav className="bg-white/5 border-white/10 w-14 sm:w-52 shrink-0 border-r p-2 sm:p-3">
      <div className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            aria-label={item.label}
            title={item.label}
            className={`flex w-full items-center justify-center sm:justify-start gap-2 rounded-md px-2 sm:px-3 py-2 text-sm transition ${
              active === item.id ? "bg-white/10 text-white" : "hover:bg-white/5 text-white/80"
            }`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <HugeiconsIcon className="size-4 opacity-70" icon={item.icon} strokeWidth={2} />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-xl font-semibold">{title}</h2>
    </header>
  );
}

async function onSignOut() {
  await authClient.signOut();
}

function GeneralSection() {
  const session = authClient.useSession();
  const user = session.data?.user;

  return (
    <div>
      <SectionHeader title="General" />
      <div>
        <Row label="Signed in as">
          <span className="text-sm">{user?.email ?? "—"}</span>
        </Row>
        <Row label="Name">
          <span className="text-sm">{user?.name ?? "—"}</span>
        </Row>
        <Row label="Session">
          <button
            className="rounded-md border border-red-500/40 px-3 py-1 text-xs text-red-500 hover:bg-red-500/10"
            onClick={onSignOut}
            type="button"
          >
            Sign out
          </button>
        </Row>
      </div>
    </div>
  );
}

type CreateState =
  | { kind: "idle" }
  | { kind: "creating" }
  | { kind: "ready"; url: string }
  | { kind: "error"; message: string };

interface PendingInvite {
  id: string;
  token: string;
  inviterUserId: string;
  /** Epoch ms — Zero replicates Postgres `timestamp` as a number. */
  expiresAt: number;
  kind: string | null;
}

function InvitesSection() {
  const [targetEmail, setTargetEmail] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [state, setState] = useState<CreateState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const z = useZero();
  // Track both which row is busy + which action (accept|decline) so the
  // opposite button doesn't show the wrong loading label.
  const [busy, setBusy] = useState<{
    id: string;
    action: "accept" | "decline";
  } | null>(null);

  const [pendingAll] = useQuery(queries.social.invitesPending());
  const [declined] = useQuery(queries.social.invitesDeclined());
  const declinedIds = new Set(declined.map((d) => d.inviteId));
  const pending: PendingInvite[] = pendingAll
    .filter((p) => !declinedIds.has(p.id))
    .map((p) => ({
      expiresAt: p.expiresAt,
      id: p.id,
      inviterUserId: p.inviterUserId,
      kind: p.kind,
      token: p.token,
    }));

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "creating" });
    setCopied(false);
    const trimmedEmail = targetEmail.trim();
    const res = await authClient.invite.create({
      kind: "friendship",
      maxUses,
      targetEmail: trimmedEmail || undefined,
    });
    if (res.error) {
      setState({
        kind: "error",
        message: res.error.message ?? "Could not create invite",
      });
      return;
    }
    setState({ kind: "ready", url: res.data?.url ?? "" });
    // Server fires sendInvite asynchronously when targetEmail is present;
    // failures are logged server-side but don't surface here (by design — the
    // URL stays usable even if delivery flakes). Toast wording reflects that.
    if (trimmedEmail) {
      toast.success(`Invite sent to ${trimmedEmail}`, {
        description: "You can also share the link directly.",
      });
    } else {
      toast.success("Invite link ready", {
        description: "Copy the link below and share it.",
      });
    }
  };

  const onCopy = async () => {
    if (state.kind !== "ready") {
      return;
    }
    await navigator.clipboard.writeText(state.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const accept = async (token: string, id: string) => {
    setBusy({ action: "accept", id });
    try {
      await authClient.invite.activate({ token });
    } finally {
      setBusy(null);
    }
  };

  const decline = async (id: string) => {
    setBusy({ action: "decline", id });
    try {
      await z.mutate(
        mutators.social.invites.decline({
          declineId: crypto.randomUUID(),
          inviteId: id,
        }),
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <SectionHeader title="Invites" />

      <section className="mb-8 space-y-3">
        <h3 className="text-sm font-medium">Send a new invite</h3>
        <form className="space-y-3" onSubmit={onCreate}>
          <input
            aria-label="Invite recipient email"
            className="border-white/15 bg-white/5 focus:border-white/30 w-full rounded-md border px-3 py-2 text-sm outline-none"
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="recipient@example.com (optional)"
            type="email"
            value={targetEmail}
          />
          <div className="flex items-center gap-3 text-xs">
            <label className="text-white/55" htmlFor="invite-max-uses-settings">
              Max uses
            </label>
            <input
              aria-label="Max invite uses"
              className="border-white/15 bg-white/5 w-20 rounded-md border px-2 py-1 text-sm outline-none"
              id="invite-max-uses-settings"
              max={50}
              min={1}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              type="number"
              value={maxUses}
            />
            <button
              className="bg-white text-black ml-auto rounded-md px-4 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
              disabled={state.kind === "creating"}
              type="submit"
            >
              {state.kind === "creating" ? "Creating…" : "Generate"}
            </button>
          </div>
        </form>

        {state.kind === "ready" && (
          <div className="border-white/10 bg-white/5 space-y-2 rounded-md border p-3">
            <div className="text-white/55 text-xs">Share this URL</div>
            <code className="block break-all text-xs">{state.url}</code>
            <button
              className="border-white/10 hover:bg-white/10 rounded border px-3 py-1 text-xs"
              onClick={onCopy}
              type="button"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
        {state.kind === "error" && <p className="text-sm text-red-500">{state.message}</p>}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Pending invites</h3>
        {pending.length === 0 ? (
          <p className="text-white/55 text-xs">No pending invites.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((inv) => (
              <div
                className="border-white/10 bg-white/5 flex items-center justify-between rounded-md border p-3"
                key={inv.id}
              >
                <div className="text-xs">
                  <div>From user {inv.inviterUserId.slice(0, 8)}</div>
                  <div className="text-white/55">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="border-white/15 hover:bg-white/10 rounded border px-3 py-1 text-xs font-medium disabled:opacity-50"
                    disabled={busy?.id === inv.id}
                    onClick={() => decline(inv.id)}
                    type="button"
                  >
                    {busy?.id === inv.id && busy.action === "decline" ? "Declining…" : "Decline"}
                  </button>
                  <button
                    className="bg-white text-black rounded px-3 py-1 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                    disabled={busy?.id === inv.id}
                    onClick={() => accept(inv.token, inv.id)}
                    type="button"
                  >
                    {busy?.id === inv.id && busy.action === "accept" ? "Accepting…" : "Accept"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FriendsSection() {
  const session = authClient.useSession();
  const z = useZero();
  const [friendships] = useQuery(queries.social.friendships());
  const [busyId, setBusyId] = useState<string | null>(null);

  const me = session.data?.user.id;
  const otherIds = friendships
    .map((f) => (f.userAId === me ? f.userBId : f.userAId))
    .filter(Boolean) as string[];
  const [friendProfiles] = useQuery(
    queries.social.friendProfiles({
      ids: otherIds.length > 0 ? otherIds : ["__none__"],
    }),
  );
  const nameById = new Map<string, string>();
  for (const p of friendProfiles) {
    nameById.set(p.id, p.displayUsername ?? p.name ?? `user ${p.id.slice(0, 8)}`);
  }

  const remove = async (friendshipId: string) => {
    setBusyId(friendshipId);
    try {
      await z.mutate(mutators.social.friendships.remove({ friendshipId }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <SectionHeader title="Friends" />
      {friendships.length === 0 ? (
        <p className="text-white/55 text-sm">No friends yet. Use Invites to send a link.</p>
      ) : (
        <div className="space-y-2">
          {friendships.map((f) => {
            const otherId = f.userAId === me ? f.userBId : f.userAId;
            return (
              <div
                className="border-white/10 bg-white/5 flex items-center justify-between rounded-md border p-3 text-xs"
                key={f.id}
              >
                <div>
                  <div>{nameById.get(otherId) ?? `user ${otherId.slice(0, 8)}`}</div>
                  <div className="text-white/55">
                    Since {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "—"}
                  </div>
                </div>
                <button
                  className="rounded border border-red-500/30 px-3 py-1 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                  disabled={busyId === f.id}
                  onClick={() => remove(f.id)}
                  type="button"
                >
                  {busyId === f.id ? "Removing…" : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AccountsSection() {
  const [accounts] = useQuery(queries.accounts.bankAccounts());
  const [busy, setBusy] = useState<string | null>(null);

  const { open: openPlaid, opening } = usePlaidLinkFlow({
    createLinkToken: async () => {
      const res = await plaidApi.createLinkToken.$post({ json: {} });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to start Plaid Link");
      }
      const data = await res.json();
      return { hookToken: data.hookToken, link_token: data.link_token };
    },
    onError: (msg) => toast.error(msg),
    onSuccess: () => toast.success("Account connected. Transactions syncing…"),
    resolveLink: async (args) => {
      const res = await plaidApi.resolveLink.$post({ json: args });
      if (!res.ok) {
        throw new Error("Failed to resolve Plaid Link");
      }
    },
  });

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const disconnect = async (id: string, label: string) => {
    setBusy(id);
    setConfirmId(null);
    try {
      const res = await accountsApi[":id"].$delete({ param: { id } });
      if (res.ok) {
        toast.success(`${label} disconnected`);
      } else {
        toast.error("Could not disconnect");
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <SectionHeader title="Accounts" />
      <div className="mb-4 flex items-center justify-between">
        <p className="text-white/55 text-xs">
          Connected banks contribute in-store transactions to your map.
        </p>
        <button
          className="border-white/20 bg-white/10 hover:bg-white/15 rounded-md border px-3 py-1 text-xs text-white transition disabled:opacity-50"
          disabled={opening}
          onClick={openPlaid}
          type="button"
        >
          {opening ? "Opening…" : "Connect bank"}
        </button>
      </div>
      {accounts.length === 0 ? (
        <p className="text-white/40 text-sm">No accounts connected yet.</p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => {
            const label = a.customName ?? a.name;
            const institution = a.plaidConnection?.institution?.name ?? a.institutionName ?? null;
            return (
              <li
                className="border-white/10 bg-white/5 flex items-center justify-between rounded-md border px-3 py-2"
                key={a.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{label}</p>
                  {institution ? (
                    <p className="text-white/50 truncate text-xs">{institution}</p>
                  ) : null}
                </div>
                {confirmId === a.id ? (
                  <div className="flex gap-1">
                    <button
                      className="text-xs text-white/60 hover:text-white"
                      onClick={() => setConfirmId(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-md bg-red-500/20 px-2 py-0.5 text-xs text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                      disabled={busy === a.id}
                      onClick={() => disconnect(a.id, label)}
                      type="button"
                    >
                      {busy === a.id ? "Disconnecting…" : "Confirm"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                    disabled={busy === a.id}
                    onClick={() => setConfirmId(a.id)}
                    type="button"
                  >
                    Disconnect
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SharingSection() {
  const [row] = useQuery(queries.social.shareSettings());
  const serverSettings: ShareSettings = row
    ? {
        shareAmount: row.shareAmount ?? DEFAULT_SHARE.shareAmount,
        shareCard: row.shareCard ?? DEFAULT_SHARE.shareCard,
        shareDate: row.shareDate ?? DEFAULT_SHARE.shareDate,
        shareMaxAmountCents: row.shareMaxAmountCents,
        shareMerchant: row.shareMerchant ?? DEFAULT_SHARE.shareMerchant,
        shareMinAmountCents: row.shareMinAmountCents,
        shareNote: row.shareNote ?? DEFAULT_SHARE.shareNote,
      }
    : DEFAULT_SHARE;
  // Optimistic overlay — null fields fall through to server state.
  const [optimistic, setOptimistic] = useState<Partial<ShareSettings>>({});
  const settings: ShareSettings = { ...serverSettings, ...optimistic };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const save = async (patch: Partial<ShareSettings>) => {
    const prevOptimistic = optimistic;
    setOptimistic((o) => ({ ...o, ...patch }));
    setSaving(true);
    setError(null);
    try {
      const res = await userApi.sharingSettings.$post({ json: patch });
      if (!mountedRef.current) {
        return;
      }
      if (!res.ok) {
        setOptimistic(prevOptimistic);
        setError("Could not save");
      }
    } catch {
      if (!mountedRef.current) {
        return;
      }
      setOptimistic(prevOptimistic);
      setError("Could not save");
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  return (
    <div>
      <SectionHeader title="Sharing" />
      <p className="text-white/55 mb-4 text-xs">
        In-store transactions are auto-shared with friends. Choose what each row reveals.
      </p>

      <div>
        <Row label="Show amount">
          <Toggle
            ariaLabel="Show amount"
            checked={settings.shareAmount}
            disabled={saving}
            onChange={(v) => save({ shareAmount: v })}
          />
        </Row>
        <Row label="Show card + bank">
          <Toggle
            ariaLabel="Show card and bank"
            checked={settings.shareCard}
            disabled={saving}
            onChange={(v) => save({ shareCard: v })}
          />
        </Row>
        <Row label="Show merchant">
          <Toggle
            ariaLabel="Show merchant"
            checked={settings.shareMerchant}
            disabled={saving}
            onChange={(v) => save({ shareMerchant: v })}
          />
        </Row>
        <Row label="Show date">
          <Toggle
            ariaLabel="Show date"
            checked={settings.shareDate}
            disabled={saving}
            onChange={(v) => save({ shareDate: v })}
          />
        </Row>
        <Row label="Show note">
          <Toggle
            ariaLabel="Show note"
            checked={settings.shareNote}
            disabled={saving}
            onChange={(v) => save({ shareNote: v })}
          />
        </Row>
        <Row label="Min amount ($)">
          <CentsInput
            ariaLabel="Minimum amount in dollars"
            cents={settings.shareMinAmountCents}
            disabled={saving}
            onCommit={(v) => save({ shareMinAmountCents: v })}
          />
        </Row>
        <Row label="Max amount ($)">
          <CentsInput
            ariaLabel="Maximum amount in dollars"
            cents={settings.shareMaxAmountCents}
            disabled={saving}
            onCommit={(v) => save({ shareMaxAmountCents: v })}
          />
        </Row>
      </div>

      <BlocklistSection
        addUrl="merchantBlocklist"
        kind="merchant"
        placeholder="Block a merchant (e.g. Starbucks)"
        title="Blocked merchants"
      />
      <BlocklistSection
        addUrl="categoryBlocklist"
        kind="category"
        placeholder="Block a category (e.g. FOOD_AND_DRINK)"
        title="Blocked categories"
      />

      {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

function BlocklistSection({
  addUrl,
  kind,
  placeholder,
  title,
}: {
  addUrl: "merchantBlocklist" | "categoryBlocklist";
  kind: "merchant" | "category";
  placeholder: string;
  title: string;
}) {
  const [merchantRows] = useQuery(queries.social.merchantBlocklist());
  const [categoryRows] = useQuery(queries.social.categoryBlocklist());
  const names =
    kind === "merchant"
      ? merchantRows.map((r) => r.merchantName)
      : categoryRows.map((r) => r.category);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    const name = draft.trim();
    if (name === "") {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res =
        addUrl === "merchantBlocklist"
          ? await userApi.sharingSettings.merchantBlocklist.$post({
              json: { name },
            })
          : await userApi.sharingSettings.categoryBlocklist.$post({
              json: { name },
            });
      if (!res.ok) {
        setErr("Could not block");
        return;
      }
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (name: string) => {
    setBusy(true);
    setErr(null);
    try {
      const res =
        addUrl === "merchantBlocklist"
          ? await userApi.sharingSettings.merchantBlocklist.$delete({
              json: { name },
            })
          : await userApi.sharingSettings.categoryBlocklist.$delete({
              json: { name },
            });
      if (!res.ok) {
        setErr("Could not unblock");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <h4 className="text-white/70 mb-2 text-xs font-medium uppercase tracking-wide">{title}</h4>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {names.length === 0 ? (
          <span className="text-white/40 text-xs">None blocked.</span>
        ) : (
          names.map((name) => (
            <button
              aria-label={`Unblock ${name}`}
              className="border-white/15 bg-white/10 hover:bg-white/15 flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs text-white transition disabled:opacity-50"
              disabled={busy}
              key={name}
              onClick={() => remove(name)}
              type="button"
            >
              <span>{name}</span>
              <span className="text-white/60">×</span>
            </button>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="border-white/10 bg-white/5 focus:border-white/30 flex-1 rounded-md border px-2 py-1 text-xs text-white outline-none"
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void add();
            }
          }}
          placeholder={placeholder}
          type="text"
          value={draft}
        />
        <button
          className="border-white/20 bg-white/10 hover:bg-white/15 rounded-md border px-3 py-1 text-xs text-white transition disabled:opacity-50"
          disabled={busy || draft.trim() === ""}
          onClick={add}
          type="button"
        >
          Block
        </button>
      </div>
      {err ? <p className="mt-1 text-xs text-red-500">{err}</p> : null}
    </div>
  );
}

function CentsInput({
  ariaLabel,
  cents,
  disabled,
  onCommit,
}: {
  ariaLabel: string;
  cents: number | null;
  disabled?: boolean;
  onCommit: (cents: number | null) => void;
}) {
  const [draft, setDraft] = useState<string>(cents === null ? "" : (cents / 100).toFixed(2));
  // React docs pattern: reset derived state during render when prop changes.
  const [prevCents, setPrevCents] = useState(cents);
  if (prevCents !== cents) {
    setPrevCents(cents);
    setDraft(cents === null ? "" : (cents / 100).toFixed(2));
  }
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onCommit(null);
      return;
    }
    const dollars = Number.parseFloat(trimmed);
    if (Number.isNaN(dollars) || dollars < 0) {
      setDraft(cents === null ? "" : (cents / 100).toFixed(2));
      return;
    }
    onCommit(Math.round(dollars * 100));
  };
  return (
    <input
      aria-label={ariaLabel}
      className="w-24 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-right text-xs text-white outline-none focus:border-white/30 disabled:opacity-50"
      disabled={disabled}
      inputMode="decimal"
      onBlur={commit}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      placeholder="—"
      type="text"
      value={draft}
    />
  );
}

function Toggle({
  ariaLabel,
  checked,
  disabled,
  onChange,
}: {
  ariaLabel: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={ariaLabel}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-emerald-500/70" : "bg-white/15"
      }`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={`bg-white inline-block h-4 w-4 rounded-full shadow transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}
