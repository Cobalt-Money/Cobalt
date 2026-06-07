import { mutators, queries } from "@cobalt-web/zero";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@cobalt-web/ui/components/dialog";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { useEffect, useState } from "react";

import { authClient } from "../lib/auth-client";

type Section = "general" | "invites" | "friends" | "sharing";

interface SettingsDialogProps {
  children: React.ReactNode;
  /** Optional initial section the dialog opens on. */
  initialSection?: Section;
}

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { icon: "⚙", id: "general", label: "General" },
  { icon: "✉", id: "invites", label: "Invites" },
  { icon: "👥", id: "friends", label: "Friends" },
  { icon: "🔒", id: "sharing", label: "Sharing" },
];

export function SettingsDialog({ children, initialSection = "general" }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>(initialSection);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent
        className="h-[80vh] max-h-[720px] w-[90vw] max-w-3xl gap-0 overflow-hidden border border-white/15 bg-black/30 p-0 text-white ring-1 ring-white/10 shadow-xl shadow-black/30 backdrop-blur-[8px] backdrop-saturate-[0.7] sm:max-w-3xl"
        overlayClassName="bg-black/30 supports-backdrop-filter:backdrop-blur-[2px]"
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex h-full min-h-0">
          <Sidebar active={section} onSelect={setSection} />
          <main className="flex-1 overflow-y-auto p-6">
            {section === "general" && <GeneralSection />}
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
    <nav className="bg-white/5 border-white/10 w-52 shrink-0 border-r p-3">
      <div className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <button
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
              active === item.id ? "bg-white/10 text-white" : "hover:bg-white/5 text-white/80"
            }`}
            key={item.id}
            onClick={() => onSelect(item.id)}
            type="button"
          >
            <span className="text-xs opacity-70">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <header className="border-white/10 mb-4 border-b pb-3">
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
      <div className="divide-white/10 divide-y">
        <Row label="Signed in as">
          <span className="text-sm">{user?.email ?? "—"}</span>
        </Row>
        <Row label="Name">
          <span className="text-sm">{user?.name ?? "—"}</span>
        </Row>
        <Row label="User ID">
          <code className="text-white/55 text-xs">{user?.id ?? "—"}</code>
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
  expiresAt: string | Date;
  kind: string;
}

function InvitesSection() {
  const [targetEmail, setTargetEmail] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [state, setState] = useState<CreateState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    const res = await authClient.invite.pending();
    if (!res.error && res.data) {
      setPending((res.data.invites ?? []) as PendingInvite[]);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "creating" });
    setCopied(false);
    const res = await authClient.invite.create({
      kind: "friendship",
      maxUses,
      targetEmail: targetEmail.trim() || undefined,
    });
    if (res.error) {
      setState({
        kind: "error",
        message: res.error.message ?? "Could not create invite",
      });
      return;
    }
    setState({ kind: "ready", url: res.data?.url ?? "" });
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
    setBusyId(id);
    await authClient.invite.activate({ token });
    setBusyId(null);
    void reload();
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
                <button
                  className="bg-white text-black rounded px-3 py-1 text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  disabled={busyId === inv.id}
                  onClick={() => accept(inv.token, inv.id)}
                  type="button"
                >
                  {busyId === inv.id ? "Accepting…" : "Accept"}
                </button>
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
                  <div>user {otherId.slice(0, 8)}</div>
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

function SharingSection() {
  return (
    <div>
      <SectionHeader title="Sharing & Privacy" />
      <div className="space-y-6">
        <Row label="Default sharing">
          <span className="text-white/55 text-xs">
            Manual — share each transaction individually
          </span>
        </Row>
        <Row label="Auto-share categories">
          <span className="text-white/55 text-xs">Coming soon — per-category toggles</span>
        </Row>
        <Row label="Privacy zones">
          <span className="text-white/55 text-xs">
            Coming soon — exclude locations (home, work)
          </span>
        </Row>
      </div>
    </div>
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
