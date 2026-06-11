import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { useState } from "react";
import type { Category, GlassStyle, PersonAgg, PinDatum, ViewMode } from "./types";
import { categoryIconSrc, categoryLabel } from "./utils";
import { ViewTabs } from "./view-tabs";

type Mode = "total" | "category" | "merchant";

const MODE_LABEL: Record<Mode, string> = {
  category: "Category",
  merchant: "Merchant",
  total: "Total",
};

function PersonAvatar({
  person,
  mutedClass,
  size = "size-5",
}: {
  person: PersonAgg;
  mutedClass: string;
  size?: string;
}) {
  if (person.imageUrl) {
    return (
      <img
        src={person.imageUrl}
        alt=""
        aria-hidden
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full text-[9px] font-medium ${
        mutedClass.includes("text-black") ? "bg-black/10" : "bg-white/15"
      }`}
    >
      {person.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function PersonRow({
  rank,
  person,
  amount,
  selfId,
  mutedClass,
}: {
  rank: number;
  person: PersonAgg;
  amount: number;
  selfId: string | undefined;
  mutedClass: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={`w-5 text-center text-xs tabular-nums ${mutedClass}`}>#{rank}</div>
      <PersonAvatar person={person} mutedClass={mutedClass} size="size-6" />
      <div className="min-w-0 flex-1 truncate text-sm font-medium">
        {person.name}
        {person.userId === selfId && (
          <span className={`ml-1 text-[11px] ${mutedClass}`}>(you)</span>
        )}
      </div>
      <div className="text-sm font-semibold tabular-nums">${amount.toFixed(0)}</div>
    </div>
  );
}

interface MerchantMeta {
  merchant: string;
  logoUrl: string | null;
  website: string | null;
  total: number;
}

function merchantMetas(pins: PinDatum[]): MerchantMeta[] {
  const map = new Map<string, MerchantMeta>();
  for (const p of pins) {
    const amt = Math.abs(p.amount);
    const existing = map.get(p.merchant);
    if (existing) {
      existing.total += amt;
    } else {
      map.set(p.merchant, {
        logoUrl: p.logoUrl,
        merchant: p.merchant,
        total: amt,
        website: p.website,
      });
    }
  }
  return [...map.values()].toSorted((a, b) => b.total - a.total);
}

function NoData({ mutedClass }: { mutedClass: string }) {
  return <div className={`py-3 text-center text-sm ${mutedClass}`}>No data</div>;
}

function TotalList({
  rows,
  selfId,
  mutedClass,
}: {
  rows: { person: PersonAgg; amount: number }[];
  selfId: string | undefined;
  mutedClass: string;
}) {
  if (rows.length === 0) {
    return <NoData mutedClass={mutedClass} />;
  }
  return (
    <>
      {rows.map((r, i) => (
        <PersonRow
          key={r.person.userId}
          rank={i + 1}
          person={r.person}
          amount={r.amount}
          selfId={selfId}
          mutedClass={mutedClass}
        />
      ))}
    </>
  );
}

function ChampionRow({
  leftIcon,
  label,
  person,
  amount,
  mutedClass,
}: {
  leftIcon: React.ReactNode;
  label: string;
  person: PersonAgg | null;
  amount: number;
  mutedClass: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {leftIcon}
      <span className="w-24 shrink-0 truncate pr-2 text-sm">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {person ? <PersonAvatar person={person} mutedClass={mutedClass} size="size-6" /> : null}
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {person ? person.name : <span className={mutedClass}>—</span>}
        </span>
      </div>
      <span className="text-sm font-semibold tabular-nums">
        {amount > 0 ? `$${amount.toFixed(0)}` : ""}
      </span>
    </div>
  );
}

function CategoryList({
  rows,
  mutedClass,
}: {
  rows: { cat: Category; person: PersonAgg | null; amount: number }[];
  mutedClass: string;
}) {
  if (rows.length === 0) {
    return <NoData mutedClass={mutedClass} />;
  }
  return (
    <>
      {rows.map(({ cat, person, amount }) => (
        <ChampionRow
          key={cat}
          leftIcon={
            <img
              src={categoryIconSrc(cat)}
              alt=""
              aria-hidden
              className="size-6 shrink-0 object-contain"
            />
          }
          label={categoryLabel(cat)}
          person={person}
          amount={amount}
          mutedClass={mutedClass}
        />
      ))}
    </>
  );
}

function MerchantList({
  rows,
  mutedClass,
}: {
  rows: { merchant: MerchantMeta; person: PersonAgg | null; amount: number }[];
  mutedClass: string;
}) {
  if (rows.length === 0) {
    return <NoData mutedClass={mutedClass} />;
  }
  return (
    <>
      {rows.map(({ merchant, person, amount }) => (
        <ChampionRow
          key={merchant.merchant}
          leftIcon={
            <MerchantLogo
              logoUrl={merchant.logoUrl}
              merchantName={merchant.merchant}
              website={merchant.website}
              className="size-6 shrink-0"
            />
          }
          label={merchant.merchant}
          person={person}
          amount={amount}
          mutedClass={mutedClass}
        />
      ))}
    </>
  );
}

function bestByCat(
  people: PersonAgg[],
  cat: Category,
): { person: PersonAgg | null; amount: number } {
  let best: PersonAgg | null = null;
  let bestAmt = 0;
  for (const p of people) {
    const a = p.byCat[cat] ?? 0;
    if (a > bestAmt) {
      best = p;
      bestAmt = a;
    }
  }
  return { amount: bestAmt, person: best };
}

function bestByMerchant(
  people: PersonAgg[],
  merchant: string,
): { person: PersonAgg | null; amount: number } {
  let best: PersonAgg | null = null;
  let bestAmt = 0;
  for (const p of people) {
    const a = p.byMerchant[merchant] ?? 0;
    if (a > bestAmt) {
      best = p;
      bestAmt = a;
    }
  }
  return { amount: bestAmt, person: best };
}

function presentCategoryOptions(people: PersonAgg[], categories: Set<Category> | null): Category[] {
  const present = new Set<Category>();
  for (const p of people) {
    for (const k of Object.keys(p.byCat)) {
      if (categories === null || categories.has(k)) {
        present.add(k);
      }
    }
  }
  return [...present].toSorted((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
}

export function PeopleLeaderboard({
  people,
  pins,
  categories,
  glassStyle,
  selfId,
  viewMode,
  onViewMode,
}: {
  people: PersonAgg[];
  pins: PinDatum[];
  categories: Set<Category> | null;
  glassStyle: GlassStyle;
  selfId: string | undefined;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
}) {
  const [mode, setMode] = useState<Mode>("total");
  const { style, textClass, mutedClass } = glassStyle;
  const isLight = textClass === "text-black";
  const activeBtn = isLight ? "bg-black text-white" : "bg-white text-black";
  const idleBtn = isLight ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10";
  const scrollClass = isLight
    ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
    : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20";

  const totalRanked = people
    .map((p) => ({ amount: p.total, person: p }))
    .toSorted((a, b) => b.amount - a.amount)
    .slice(0, 10);
  const categoryRanked = presentCategoryOptions(people, categories).map((cat) => ({
    cat,
    ...bestByCat(people, cat),
  }));
  const merchantRanked =
    mode === "merchant"
      ? merchantMetas(pins).map((m) => ({
          merchant: m,
          ...bestByMerchant(people, m.merchant),
        }))
      : [];

  return (
    <div className="absolute left-4 top-20 z-10 w-80 max-w-[calc(100vw-2rem)]">
      <div className={`rounded-2xl border ${textClass}`} style={style}>
        <ViewTabs viewMode={viewMode} onViewMode={onViewMode} glassStyle={glassStyle} />
        <div className="flex gap-1 p-2">
          {(["total", "category", "merchant"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${mode === m ? activeBtn : idleBtn}`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <div
          className={`max-h-[60vh] overflow-y-auto px-4 pb-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full ${scrollClass}`}
        >
          {mode === "total" && (
            <TotalList rows={totalRanked} selfId={selfId} mutedClass={mutedClass} />
          )}
          {mode === "category" && <CategoryList rows={categoryRanked} mutedClass={mutedClass} />}
          {mode === "merchant" && <MerchantList rows={merchantRanked} mutedClass={mutedClass} />}
        </div>
      </div>
    </div>
  );
}
