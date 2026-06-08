import { queries } from "@cobalt-web/zero";
import { useQuery as useZeroQuery } from "@rocicorp/zero/react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { userApi } from "@/lib/clients/api-client";

export const Route = createFileRoute("/_auth/settings/sharing")({
  component: SharingSettings,
  loader: ({ context }) => {
    context.zero?.preload(queries.social.shareSettings(), { ttl: "5m" });
    context.zero?.preload(queries.social.merchantBlocklist(), { ttl: "5m" });
    context.zero?.preload(queries.social.categoryBlocklist(), { ttl: "5m" });
  },
  staticData: { title: "Sharing" },
});

interface ShareSettings {
  shareAmount: boolean;
  shareCard: boolean;
  shareDate: boolean;
  shareMaxAmountCents: number | null;
  shareMerchant: boolean;
  shareMinAmountCents: number | null;
  shareNote: boolean;
}

const DEFAULTS: ShareSettings = {
  shareAmount: true,
  shareCard: true,
  shareDate: true,
  shareMaxAmountCents: null,
  shareMerchant: true,
  shareMinAmountCents: null,
  shareNote: false,
};

function SharingSettings() {
  const [row] = useZeroQuery(queries.social.shareSettings());
  const settings: ShareSettings = row
    ? {
        shareAmount: row.shareAmount ?? DEFAULTS.shareAmount,
        shareCard: row.shareCard ?? DEFAULTS.shareCard,
        shareDate: row.shareDate ?? DEFAULTS.shareDate,
        shareMaxAmountCents: row.shareMaxAmountCents,
        shareMerchant: row.shareMerchant ?? DEFAULTS.shareMerchant,
        shareMinAmountCents: row.shareMinAmountCents,
        shareNote: row.shareNote ?? DEFAULTS.shareNote,
      }
    : DEFAULTS;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (patch: Partial<ShareSettings>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await userApi.sharingSettings.$post({ json: patch });
      if (!res.ok) {
        setError("Could not save");
      }
    } catch {
      setError("Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-semibold text-2xl">Sharing</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Auto-share in-store transactions with friends. Choose what gets revealed.
        </p>
      </header>

      <section className="divide-y divide-border rounded-lg border border-border">
        <Row label="Show amount">
          <Toggle
            checked={settings.shareAmount}
            disabled={saving}
            onChange={(v) => save({ shareAmount: v })}
          />
        </Row>
        <Row label="Show card + bank">
          <Toggle
            checked={settings.shareCard}
            disabled={saving}
            onChange={(v) => save({ shareCard: v })}
          />
        </Row>
        <Row label="Show merchant">
          <Toggle
            checked={settings.shareMerchant}
            disabled={saving}
            onChange={(v) => save({ shareMerchant: v })}
          />
        </Row>
        <Row label="Show date">
          <Toggle
            checked={settings.shareDate}
            disabled={saving}
            onChange={(v) => save({ shareDate: v })}
          />
        </Row>
        <Row label="Show note">
          <Toggle
            checked={settings.shareNote}
            disabled={saving}
            onChange={(v) => save({ shareNote: v })}
          />
        </Row>
        <Row label="Min amount ($)">
          <CentsInput
            cents={settings.shareMinAmountCents}
            disabled={saving}
            onCommit={(v) => save({ shareMinAmountCents: v })}
          />
        </Row>
        <Row label="Max amount ($)">
          <CentsInput
            cents={settings.shareMaxAmountCents}
            disabled={saving}
            onCommit={(v) => save({ shareMaxAmountCents: v })}
          />
        </Row>
      </section>

      <Blocklist
        kind="merchant"
        placeholder="Block a merchant (e.g. Starbucks)"
        title="Blocked merchants"
      />
      <Blocklist
        kind="category"
        placeholder="Block a category (e.g. FOOD_AND_DRINK)"
        title="Blocked categories"
      />

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-muted-foreground/30"
      }`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-background shadow transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function CentsInput({
  cents,
  disabled,
  onCommit,
}: {
  cents: number | null;
  disabled?: boolean;
  onCommit: (cents: number | null) => void;
}) {
  const [draft, setDraft] = useState(cents === null ? "" : (cents / 100).toFixed(2));
  useEffect(() => {
    setDraft(cents === null ? "" : (cents / 100).toFixed(2));
  }, [cents]);
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
      className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-sm outline-none focus:border-foreground/30 disabled:opacity-50"
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

function Blocklist({
  kind,
  placeholder,
  title,
}: {
  kind: "merchant" | "category";
  placeholder: string;
  title: string;
}) {
  const [merchantRows] = useZeroQuery(queries.social.merchantBlocklist());
  const [categoryRows] = useZeroQuery(queries.social.categoryBlocklist());
  const names =
    kind === "merchant"
      ? merchantRows.map((r) => r.merchantName)
      : categoryRows.map((r) => r.category);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const name = draft.trim();
    if (name === "") {
      return;
    }
    setBusy(true);
    try {
      await (kind === "merchant"
        ? userApi.sharingSettings.merchantBlocklist.$post({ json: { name } })
        : userApi.sharingSettings.categoryBlocklist.$post({ json: { name } }));
      setDraft("");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (name: string) => {
    setBusy(true);
    try {
      await (kind === "merchant"
        ? userApi.sharingSettings.merchantBlocklist.$delete({ json: { name } })
        : userApi.sharingSettings.categoryBlocklist.$delete({ json: { name } }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {names.length === 0 ? (
          <span className="text-muted-foreground text-xs">None blocked.</span>
        ) : (
          names.map((name) => (
            <button
              aria-label={`Unblock ${name}`}
              className="flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs transition hover:bg-muted disabled:opacity-50"
              disabled={busy}
              key={name}
              onClick={() => remove(name)}
              type="button"
            >
              <span>{name}</span>
              <span className="text-muted-foreground">×</span>
            </button>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-foreground/30 disabled:opacity-50"
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
          className="rounded-md border border-border bg-muted px-3 py-1 text-sm transition hover:bg-muted/70 disabled:opacity-50"
          disabled={busy || draft.trim() === ""}
          onClick={add}
          type="button"
        >
          Block
        </button>
      </div>
    </section>
  );
}
