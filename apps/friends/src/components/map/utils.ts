import { CATEGORY_SYSTEM_ICON_SRC } from "@cobalt-web/ui/cobalt/transactions/categories/index";
import { CATEGORY_LABEL_OVERRIDES } from "./constants";
import type { GlassConfig, GlassStyle, PersonAgg, PinDatum, TimeWindow } from "./types";

// Stack key = merchant name + ~1km coord bucket. Pure coord rounding misses
// repeat visits because Plaid lat/lng can drift tens of meters between txns
// at the same shop; pure merchant name would merge "Chipotle SF" with
// "Chipotle NYC". The combo groups repeat visits at one location.
export function stackKeyForPin(p: { merchant: string; position: [number, number] }): string {
  return `${p.merchant}|${p.position[0].toFixed(2)},${p.position[1].toFixed(2)}`;
}

export function categoryLabel(key: string): string {
  if (CATEGORY_LABEL_OVERRIDES[key]) {
    return CATEGORY_LABEL_OVERRIDES[key];
  }
  return key
    .split("_")
    .map((w) => (w ? (w[0] ?? "").toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

export function categoryIconSrc(key: string): string {
  const map = CATEGORY_SYSTEM_ICON_SRC as Record<string, string | undefined>;
  return map[key] ?? map.uncategorized ?? "";
}

// Drizzle returns `timestamp` columns as Date objects, but `Date` doesn't
// survive the wire to friends (Zero serializes). Accept anything that
// `new Date(x)` understands.
export function normalizePostDate(d: unknown): number | string | null {
  if (d === null || d === undefined) {
    return null;
  }
  if (typeof d === "number" || typeof d === "string") {
    return d;
  }
  if (d instanceof Date) {
    return d.getTime();
  }
  return null;
}

export function withinWindow(date: string | number | null, days: TimeWindow): boolean {
  if (days === 0) {
    return true;
  }
  if (date === null) {
    return false;
  }
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) {
    return false;
  }
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

export function computeGlassStyle(g: GlassConfig, isLight: boolean): GlassStyle {
  // Dark glass tint = zinc-700 (63,63,70) rather than pure black so panels
  // read as warm gray against satellite/dark map styles. Light unchanged.
  const bgRgb = isLight ? "255, 255, 255" : "63, 63, 70";
  const edgeRgb = isLight ? "0, 0, 0" : "255, 255, 255";
  return {
    dividerClass: isLight ? "border-black/10" : "border-white/10",
    hoverClass: isLight ? "hover:bg-black/5" : "hover:bg-white/10",
    mutedClass: isLight ? "text-black/55" : "text-white/60",
    style: {
      WebkitBackdropFilter: `blur(${g.blurPx}px) saturate(${g.saturate})`,
      backdropFilter: `blur(${g.blurPx}px) saturate(${g.saturate})`,
      backgroundColor: `rgba(${bgRgb}, ${g.bgAlpha})`,
      borderColor: `rgba(${edgeRgb}, ${g.borderAlpha})`,
      boxShadow: `0 0 0 1px rgba(${edgeRgb}, ${g.ringAlpha}), 0 25px 50px -12px rgba(0, 0, 0, 0.5)`,
    },
    textClass: isLight ? "text-black" : "text-white",
  };
}

export function aggregatePeople(allPins: PinDatum[]): PersonAgg[] {
  const personAgg = new Map<string, PersonAgg>();
  for (const p of allPins) {
    const amt = Math.abs(p.amount);
    const existing = personAgg.get(p.userId);
    if (existing) {
      existing.total += amt;
      existing.count += 1;
      existing.lat += p.position[1];
      existing.lon += p.position[0];
      existing.byCat[p.category] = (existing.byCat[p.category] ?? 0) + amt;
      existing.byMerchant[p.merchant] = (existing.byMerchant[p.merchant] ?? 0) + amt;
    } else {
      personAgg.set(p.userId, {
        byCat: { [p.category]: amt },
        byMerchant: { [p.merchant]: amt },
        count: 1,
        imageUrl: p.personImageUrl,
        lat: p.position[1],
        lon: p.position[0],
        name: p.person,
        total: amt,
        userId: p.userId,
      });
    }
  }
  return [...personAgg.values()].map((a) => ({
    ...a,
    lat: a.lat / a.count,
    lon: a.lon / a.count,
  }));
}
