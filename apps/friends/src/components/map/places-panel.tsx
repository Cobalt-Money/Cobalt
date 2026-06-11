import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { GlassStyle, PinDatum, PlaceAgg, PlaceMerchant, ViewMode } from "./types";
import { ViewTabs } from "./view-tabs";

function aggregatePlaces(pins: PinDatum[]): PlaceAgg[] {
  const byPlace = new Map<string, PlaceAgg>();
  for (const p of pins) {
    const { city } = p;
    const { region } = p;
    const key = `${city ?? ""}|${region ?? ""}`;
    let place = byPlace.get(key);
    if (!place) {
      place = { city, count: 0, key, merchants: [], region, total: 0 };
      byPlace.set(key, place);
    }
    const amt = Math.abs(p.amount);
    place.total += amt;
    place.count += 1;
    const existing = place.merchants.find((m) => m.merchant === p.merchant);
    if (existing) {
      existing.total += amt;
      existing.count += 1;
    } else {
      place.merchants.push({
        count: 1,
        logoUrl: p.logoUrl,
        merchant: p.merchant,
        position: p.position,
        total: amt,
        website: p.website,
      });
    }
  }
  for (const place of byPlace.values()) {
    place.merchants.sort((a, b) => b.total - a.total);
  }
  return [...byPlace.values()].toSorted((a, b) => b.total - a.total);
}

function placeLabel(p: PlaceAgg): string {
  const parts = [p.city, p.region].filter(Boolean);
  return parts.length === 0 ? "Unknown location" : parts.join(", ");
}

function matchesPlace(p: PlaceAgg, q: string): boolean {
  if (q === "") {
    return true;
  }
  if (placeLabel(p).toLowerCase().includes(q)) {
    return true;
  }
  return p.merchants.some((m) => m.merchant.toLowerCase().includes(q));
}

export function PlacesPanel({
  pins,
  glassStyle,
  viewMode,
  onViewMode,
  flyTo,
}: {
  pins: PinDatum[];
  glassStyle: GlassStyle;
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  flyTo: (lon: number, lat: number) => void;
}) {
  const [query, setQuery] = useState("");
  const { style, textClass, mutedClass, hoverClass } = glassStyle;
  const isLight = textClass === "text-black";
  const iconClass = isLight ? "text-black/40" : "text-white/40";
  const inputClass = isLight
    ? "bg-black/5 placeholder:text-black/40 text-black focus:bg-black/10"
    : "bg-white/5 placeholder:text-white/40 text-white focus:bg-white/10";
  const scrollClass = isLight
    ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
    : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20";

  const places = aggregatePlaces(pins);
  const q = query.trim().toLowerCase();
  const filtered = places.filter((p) => matchesPlace(p, q));

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
              aria-label="Search places or merchants"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, merchant…"
              className={`w-full rounded-lg py-1.5 pr-3 pl-8 text-sm outline-none ${inputClass}`}
            />
          </div>
        </div>
        <div
          className={`max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full ${scrollClass}`}
        >
          {filtered.map((place) => (
            <div key={place.key}>
              <div className="py-1">
                {place.merchants.map((m: PlaceMerchant) => (
                  <button
                    key={`${place.key}-${m.merchant}`}
                    type="button"
                    onClick={() => flyTo(m.position[0], m.position[1])}
                    className={`flex w-full items-center gap-3 px-4 py-1.5 text-left transition ${hoverClass}`}
                  >
                    <MerchantLogo
                      logoUrl={m.logoUrl}
                      merchantName={m.merchant}
                      website={m.website}
                      className="size-6 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium leading-tight">{m.merchant}</div>
                      <div className={`text-[11px] ${mutedClass}`}>
                        {m.count} {m.count === 1 ? "txn" : "txns"}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums">${m.total.toFixed(0)}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className={`px-4 py-6 text-center text-sm ${mutedClass}`}>No places</div>
          )}
        </div>
      </div>
    </div>
  );
}
