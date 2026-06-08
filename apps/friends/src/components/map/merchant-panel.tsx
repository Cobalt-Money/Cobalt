import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { GlassStyle, MerchantTotal, PinDatum, UnmappedTxn } from "./types";

function matchesPin(p: PinDatum, q: string): boolean {
  if (q === "") {
    return true;
  }
  const city = (p.city ?? "").toLowerCase();
  const region = (p.region ?? "").toLowerCase();
  return p.merchant.toLowerCase().includes(q) || city.includes(q) || region.includes(q);
}

function matchesUnmapped(t: UnmappedTxn, q: string): boolean {
  if (q === "") {
    return true;
  }
  const m = (t.merchantName ?? t.name ?? "").toLowerCase();
  const city = (t.city ?? "").toLowerCase();
  const region = (t.region ?? "").toLowerCase();
  return m.includes(q) || city.includes(q) || region.includes(q);
}

function byDateDesc(a: { date: string | number | null }, b: { date: string | number | null }) {
  const tA = a.date ? new Date(a.date).getTime() : 0;
  const tB = b.date ? new Date(b.date).getTime() : 0;
  return tB - tA;
}

function fmtShortDate(d: string | number | null): string {
  if (!d) {
    return "";
  }
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function joinLoc(city: string | null, region: string | null): string {
  return [city, region].filter(Boolean).join(", ");
}

function SearchInput({
  value,
  onChange,
  ariaLabel,
  placeholder,
  isLight,
  dividerClass,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder: string;
  isLight: boolean;
  dividerClass: string;
}) {
  const iconClass = isLight ? "text-black/40" : "text-white/40";
  const inputClass = isLight
    ? "bg-black/5 placeholder:text-black/40 text-black focus:bg-black/10"
    : "bg-white/5 placeholder:text-white/40 text-white focus:bg-white/10";
  return (
    <div className={`border-b px-3 py-2 ${dividerClass}`}>
      <div className="relative">
        <HugeiconsIcon
          className={`pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 ${iconClass}`}
          icon={Search01Icon}
          size={14}
          strokeWidth={2}
        />
        <input
          aria-label={ariaLabel}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-lg py-1.5 pr-3 pl-8 text-sm outline-none ${inputClass}`}
        />
      </div>
    </div>
  );
}

function scrollbarClass(isLight: boolean): string {
  const colorClass = isLight
    ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
    : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20";
  return `max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ${colorClass} [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full`;
}

function InStoreTab({
  pins,
  query,
  onQuery,
  flyTo,
  selfId,
  onSelectTxn,
  glassStyle,
  isLight,
}: {
  pins: PinDatum[];
  query: string;
  onQuery: (v: string) => void;
  flyTo: (lon: number, lat: number) => void;
  selfId: string | undefined;
  onSelectTxn: (id: string | null) => void;
  glassStyle: GlassStyle;
  isLight: boolean;
}) {
  const { mutedClass, dividerClass, hoverClass } = glassStyle;
  return (
    <>
      <SearchInput
        value={query}
        onChange={onQuery}
        ariaLabel="Search in-store merchants"
        placeholder="Search merchant, city…"
        isLight={isLight}
        dividerClass={dividerClass}
      />
      <div className={scrollbarClass(isLight)}>
        {pins.map((p) => {
          const isOutflow = p.amount < 0;
          const dateStr = fmtShortDate(p.date);
          const loc = joinLoc(p.city, p.region);
          const amountClass = isOutflow ? "text-destructive" : "text-success";
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                flyTo(p.position[0], p.position[1]);
                if (p.userId === selfId) {
                  onSelectTxn(p.id);
                } else {
                  onSelectTxn(null);
                }
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${hoverClass}`}
            >
              <MerchantLogo
                counterparties={null}
                logoUrl={p.logoUrl}
                merchantName={p.merchant}
                website={p.website}
                className="size-7 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium leading-tight">{p.merchant}</div>
                <div className={`flex items-center gap-1.5 text-[11px] ${mutedClass}`}>
                  <span>{dateStr}</span>
                  {loc && <span>·</span>}
                  {loc && <span className="truncate">{loc}</span>}
                </div>
              </div>
              <div className={`text-sm font-semibold tabular-nums ${amountClass}`}>
                ${Math.abs(p.amount).toFixed(0)}
              </div>
            </button>
          );
        })}
        {pins.length === 0 && (
          <div className={`px-4 py-6 text-center text-sm ${mutedClass}`}>
            No in-store transactions
          </div>
        )}
      </div>
    </>
  );
}

function TopTab({
  merchants,
  topMerchants,
  query,
  onQuery,
  glassStyle,
  isLight,
}: {
  merchants: MerchantTotal[];
  topMerchants: MerchantTotal[];
  query: string;
  onQuery: (v: string) => void;
  glassStyle: GlassStyle;
  isLight: boolean;
}) {
  const { mutedClass, dividerClass, hoverClass } = glassStyle;
  return (
    <>
      <SearchInput
        value={query}
        onChange={onQuery}
        ariaLabel="Search top merchants"
        placeholder="Search merchant…"
        isLight={isLight}
        dividerClass={dividerClass}
      />
      <div className={scrollbarClass(isLight)}>
        {topMerchants.map((m) => (
          <div
            key={m.merchant}
            className={`flex items-center gap-3 px-4 py-2.5 transition ${hoverClass}`}
          >
            <MerchantLogo
              counterparties={null}
              logoUrl={m.logoUrl}
              merchantName={m.merchant}
              website={m.website}
              className="size-7 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight">{m.merchant}</div>
              <div className={`text-[11px] ${mutedClass}`}>
                {m.count} {m.count === 1 ? "txn" : "txns"}
              </div>
            </div>
            <div className="text-sm font-semibold tabular-nums">${m.total.toFixed(0)}</div>
          </div>
        ))}
        {merchants.length === 0 && (
          <div className={`px-4 py-6 text-center text-sm ${mutedClass}`}>No transactions yet</div>
        )}
      </div>
    </>
  );
}

function UnmappedTab({
  unmapped,
  query,
  onQuery,
  onSelectTxn,
  glassStyle,
  isLight,
}: {
  unmapped: UnmappedTxn[];
  query: string;
  onQuery: (v: string) => void;
  onSelectTxn: (id: string | null) => void;
  glassStyle: GlassStyle;
  isLight: boolean;
}) {
  const { mutedClass, dividerClass, hoverClass } = glassStyle;
  return (
    <>
      <SearchInput
        value={query}
        onChange={onQuery}
        ariaLabel="Search unmapped merchants"
        placeholder="Search merchant, city…"
        isLight={isLight}
        dividerClass={dividerClass}
      />
      <div className={scrollbarClass(isLight)}>
        {unmapped.map((t) => {
          const merchant = t.merchantName ?? t.name ?? "Unknown";
          const amt = Number(t.amount ?? 0);
          const isOutflow = amt < 0;
          const dateStr = fmtShortDate(t.date);
          const loc = joinLoc(t.city, t.region);
          const amountClass = isOutflow ? "text-destructive" : "text-success";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelectTxn(t.id)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${hoverClass}`}
            >
              <MerchantLogo
                counterparties={null}
                logoUrl={t.logoUrl}
                merchantName={merchant}
                website={t.website}
                className="size-7 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium leading-tight">{merchant}</div>
                <div className={`flex items-center gap-1.5 text-[11px] ${mutedClass}`}>
                  <span>{dateStr}</span>
                  {loc && <span>·</span>}
                  {loc && <span className="truncate">{loc}</span>}
                </div>
              </div>
              <div className={`text-sm font-semibold tabular-nums ${amountClass}`}>
                ${Math.abs(amt).toFixed(0)}
              </div>
            </button>
          );
        })}
        {unmapped.length === 0 && (
          <div className={`px-4 py-6 text-center text-sm ${mutedClass}`}>
            All in-store transactions have location data 🎉
          </div>
        )}
      </div>
    </>
  );
}

export function MerchantPanel({
  merchants,
  unmappedTxns,
  inStorePins,
  flyTo,
  selfId,
  onSelectTxn,
  glassStyle,
}: {
  merchants: MerchantTotal[];
  unmappedTxns: UnmappedTxn[];
  inStorePins: PinDatum[];
  flyTo: (lon: number, lat: number) => void;
  selfId: string | undefined;
  onSelectTxn: (id: string | null) => void;
  glassStyle: GlassStyle;
}) {
  const [tab, setTab] = useState<"top" | "instore" | "unmapped">("top");
  const [inStoreQuery, setInStoreQuery] = useState("");
  const [topQuery, setTopQuery] = useState("");
  const [unmappedQuery, setUnmappedQuery] = useState("");

  const q = inStoreQuery.trim().toLowerCase();
  const tq = topQuery.trim().toLowerCase();
  const uq = unmappedQuery.trim().toLowerCase();

  const sortedInStore = inStorePins.filter((p) => matchesPin(p, q)).toSorted(byDateDesc);
  const filteredMerchants = merchants.filter((m) =>
    tq === "" ? true : m.merchant.toLowerCase().includes(tq),
  );
  const top = filteredMerchants.slice(0, 20);
  const sortedUnmapped = unmappedTxns.filter((t) => matchesUnmapped(t, uq)).toSorted(byDateDesc);

  const { style, textClass, dividerClass } = glassStyle;
  const isLight = textClass === "text-black";
  const activeTab = isLight ? "bg-black text-white" : "bg-white text-black";
  const idleTab = isLight ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10";

  return (
    <div className="absolute left-4 top-4 z-10 w-72 max-w-[calc(100vw-2rem)]">
      <div className={`rounded-2xl border ${textClass}`} style={style}>
        <div className={`flex gap-1 border-b p-2 ${dividerClass}`}>
          <button
            type="button"
            onClick={() => setTab("top")}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${tab === "top" ? activeTab : idleTab}`}
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => setTab("instore")}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${tab === "instore" ? activeTab : idleTab}`}
          >
            In-store {sortedInStore.length > 0 && `(${sortedInStore.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab("unmapped")}
            className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${tab === "unmapped" ? activeTab : idleTab}`}
          >
            Unmapped {unmappedTxns.length > 0 && `(${unmappedTxns.length})`}
          </button>
        </div>
        {tab === "instore" && (
          <InStoreTab
            pins={sortedInStore}
            query={inStoreQuery}
            onQuery={setInStoreQuery}
            flyTo={flyTo}
            selfId={selfId}
            onSelectTxn={onSelectTxn}
            glassStyle={glassStyle}
            isLight={isLight}
          />
        )}
        {tab === "top" && (
          <TopTab
            merchants={merchants}
            topMerchants={top}
            query={topQuery}
            onQuery={setTopQuery}
            glassStyle={glassStyle}
            isLight={isLight}
          />
        )}
        {tab === "unmapped" && (
          <UnmappedTab
            unmapped={sortedUnmapped}
            query={unmappedQuery}
            onQuery={setUnmappedQuery}
            onSelectTxn={onSelectTxn}
            glassStyle={glassStyle}
            isLight={isLight}
          />
        )}
      </div>
    </div>
  );
}
