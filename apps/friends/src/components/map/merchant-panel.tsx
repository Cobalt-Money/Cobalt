import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { GlassStyle, PinDatum, UnmappedTxn, ViewMode } from "./types";
import { ViewTabs } from "./view-tabs";

interface TxnRow {
  id: string;
  merchant: string;
  amount: number;
  date: string | number | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  website: string | null;
  position: [number, number] | null;
  userId: string | null;
  personName: string;
  personImageUrl: string | null;
}

function pinToRow(p: PinDatum): TxnRow {
  return {
    amount: p.amount,
    city: p.city,
    date: p.date,
    id: p.id,
    logoUrl: p.logoUrl,
    merchant: p.merchant,
    personImageUrl: p.personImageUrl,
    personName: p.person,
    position: p.position,
    region: p.region,
    userId: p.userId,
    website: p.website,
  };
}

function unmappedToRow(t: UnmappedTxn, selfName: string, selfImageUrl: string | null): TxnRow {
  return {
    amount: Number(t.amount ?? 0),
    city: t.city,
    date: t.date,
    id: t.id,
    logoUrl: t.logoUrl,
    merchant: t.merchantName ?? t.name ?? "Unknown",
    personImageUrl: selfImageUrl,
    personName: selfName,
    position: null,
    region: t.region,
    userId: null,
    website: t.website,
  };
}

function matchesRow(r: TxnRow, q: string): boolean {
  if (q === "") {
    return true;
  }
  return (
    r.merchant.toLowerCase().includes(q) ||
    (r.city ?? "").toLowerCase().includes(q) ||
    (r.region ?? "").toLowerCase().includes(q)
  );
}

function byDateDesc(a: TxnRow, b: TxnRow): number {
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

export function MerchantPanel({
  unmappedTxns,
  inStorePins,
  flyTo,
  selfId,
  selfName,
  selfImageUrl,
  onSelectTxn,
  glassStyle,
  viewMode,
  onViewMode,
}: {
  unmappedTxns: UnmappedTxn[];
  inStorePins: PinDatum[];
  flyTo: (lon: number, lat: number) => void;
  selfId: string | undefined;
  selfName: string;
  selfImageUrl: string | null;
  onSelectTxn: (id: string | null) => void;
  glassStyle: GlassStyle;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const rows = [
    ...inStorePins.map(pinToRow),
    ...unmappedTxns.map((t) => unmappedToRow(t, selfName, selfImageUrl)),
  ]
    .filter((r) => matchesRow(r, q))
    .toSorted(byDateDesc);

  const { style, textClass, mutedClass, hoverClass } = glassStyle;
  const isLight = textClass === "text-black";
  const iconClass = isLight ? "text-black/40" : "text-white/40";
  const inputClass = isLight
    ? "bg-black/5 placeholder:text-black/40 text-black focus:bg-black/10"
    : "bg-white/5 placeholder:text-white/40 text-white focus:bg-white/10";
  const scrollClass = isLight
    ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
    : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20";

  return (
    <div className="absolute left-4 top-20 z-10 w-80 max-w-[calc(100vw-2rem)]">
      <div className={`rounded-2xl border ${textClass}`} style={style}>
        <ViewTabs viewMode={viewMode} onViewMode={onViewMode} glassStyle={glassStyle} />
        <div className="px-3 py-2">
          <div className="relative">
            <HugeiconsIcon
              className={`pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 ${iconClass}`}
              icon={Search01Icon}
              size={14}
              strokeWidth={2}
            />
            <input
              aria-label="Search in-store transactions"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant, city…"
              className={`w-full rounded-lg py-1.5 pr-3 pl-8 text-sm outline-none ${inputClass}`}
            />
          </div>
        </div>
        <div
          className={`max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full ${scrollClass}`}
        >
          {rows.map((r) => {
            const isOutflow = r.amount < 0;
            const dateStr = fmtShortDate(r.date);
            const loc = joinLoc(r.city, r.region);
            const amountClass = isOutflow ? "text-destructive" : "text-success";
            const mapped = r.position !== null;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (r.position) {
                    flyTo(r.position[0], r.position[1]);
                  }
                  if (!mapped || r.userId === selfId) {
                    onSelectTxn(r.id);
                  } else {
                    onSelectTxn(null);
                  }
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${hoverClass}`}
              >
                <div className="relative shrink-0">
                  <MerchantLogo
                    logoUrl={r.logoUrl}
                    merchantName={r.merchant}
                    website={r.website}
                    className="size-7"
                  />
                  {r.personImageUrl ? (
                    <img
                      src={r.personImageUrl}
                      alt=""
                      aria-hidden
                      className={`absolute -bottom-0.5 -right-0.5 z-20 size-3.5 rounded-full border object-cover ${
                        isLight ? "border-white" : "border-black"
                      }`}
                    />
                  ) : (
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 z-20 flex size-3.5 items-center justify-center rounded-full border text-[7px] font-medium ${
                        isLight
                          ? "border-white bg-black/10 text-black"
                          : "border-black bg-white/15 text-white"
                      }`}
                    >
                      {r.personName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium leading-tight">{r.merchant}</div>
                  <div className={`flex items-center gap-1.5 text-[11px] ${mutedClass}`}>
                    <span>{dateStr}</span>
                    {loc ? (
                      <>
                        <span>·</span>
                        <span className="truncate">{loc}</span>
                      </>
                    ) : null}
                    {mapped ? null : (
                      <>
                        <span>·</span>
                        <span className="italic">no location</span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`text-sm font-semibold tabular-nums ${amountClass}`}>
                  ${Math.abs(r.amount).toFixed(0)}
                </div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <div className={`px-4 py-6 text-center text-sm ${mutedClass}`}>
              No in-store transactions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
