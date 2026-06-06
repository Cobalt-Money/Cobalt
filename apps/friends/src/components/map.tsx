import { MapboxOverlay } from "@deck.gl/mapbox";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import { ScatterplotLayer } from "@deck.gl/layers";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { Tiles3DLoader } from "@loaders.gl/3d-tiles";
import { queries } from "@cobalt-web/zero";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { useQuery } from "@rocicorp/zero/react";
import { Map, useControl } from "react-map-gl/maplibre";
import { useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { authClient } from "../lib/auth-client";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const GOOGLE_3D_TILES_KEY = import.meta.env.VITE_GOOGLE_3D_TILES_KEY as string | undefined;

const MAP_STYLES = {
  "carto-dark": {
    label: "Carto Dark (labels)",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  "carto-dark-nolabels": {
    label: "Carto Dark (no labels)",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  },
  "carto-light": {
    label: "Carto Light (labels)",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  "carto-light-nolabels": {
    label: "Carto Light (no labels)",
    url: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
  },
  "carto-voyager": {
    label: "Carto Voyager (labels)",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  "carto-voyager-nolabels": {
    label: "Carto Voyager (no labels)",
    url: "https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json",
  },
  "maplibre-demo": {
    label: "MapLibre Demo (debug)",
    url: "https://demotiles.maplibre.org/style.json",
  },
  "ofm-bright": {
    label: "OpenFreeMap Bright",
    url: "https://tiles.openfreemap.org/styles/bright",
  },
  "ofm-dark": {
    label: "OpenFreeMap Dark",
    url: "https://tiles.openfreemap.org/styles/dark",
  },
  "ofm-fiord": {
    label: "OpenFreeMap Fiord",
    url: "https://tiles.openfreemap.org/styles/fiord",
  },
  "ofm-liberty": {
    label: "OpenFreeMap Liberty",
    url: "https://tiles.openfreemap.org/styles/liberty",
  },
  "ofm-positron": {
    label: "OpenFreeMap Positron",
    url: "https://tiles.openfreemap.org/styles/positron",
  },
  "versatiles-colorful": {
    label: "Versatiles Colorful",
    url: "https://tiles.versatiles.org/assets/styles/colorful/style.json",
  },
  "versatiles-eclipse": {
    label: "Versatiles Eclipse",
    url: "https://tiles.versatiles.org/assets/styles/eclipse/style.json",
  },
  "versatiles-graybeard": {
    label: "Versatiles Graybeard",
    url: "https://tiles.versatiles.org/assets/styles/graybeard/style.json",
  },
  "versatiles-neutrino": {
    label: "Versatiles Neutrino",
    url: "https://tiles.versatiles.org/assets/styles/neutrino/style.json",
  },
  ...(MAPTILER_KEY && {
    "maptiler-backdrop": {
      label: "MapTiler Backdrop",
      url: `https://api.maptiler.com/maps/backdrop/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-dataviz-dark": {
      label: "MapTiler Dataviz Dark",
      url: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-outdoor": {
      label: "MapTiler Outdoor",
      url: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-satellite": {
      label: "MapTiler Satellite",
      url: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-streets-dark": {
      label: "MapTiler Streets Dark",
      url: `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_KEY}`,
    },
    "maptiler-toner": {
      label: "MapTiler Toner",
      url: `https://api.maptiler.com/maps/toner-v2/style.json?key=${MAPTILER_KEY}`,
    },
  }),
} as const;

type StyleKey = keyof typeof MAP_STYLES;

const LIGHT_STYLES = new Set<StyleKey>([
  "carto-light",
  "carto-light-nolabels",
  "carto-voyager",
  "carto-voyager-nolabels",
  "ofm-liberty",
  "ofm-bright",
  "ofm-positron",
  "ofm-fiord",
  "versatiles-colorful",
  "versatiles-graybeard",
  "versatiles-neutrino",
  "maptiler-outdoor",
  "maptiler-backdrop",
  "maptiler-toner",
] as StyleKey[]);

const INITIAL_VIEW_STATE = {
  bearing: 20,
  latitude: 40.7128,
  longitude: -74.006,
  pitch: 60,
  zoom: 12,
};

interface PinDatum {
  id: string;
  position: [number, number];
  merchant: string;
  amount: number;
  person: string;
  date: string | number | null;
  logoUrl: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  notes: string | null;
}

function DeckGLOverlay(props: MapboxOverlayProps) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

interface HoverState {
  pin: PinDatum;
  x: number;
  y: number;
}

interface GlassConfig {
  blurPx: number;
  bgAlpha: number;
  saturate: number;
  borderAlpha: number;
  ringAlpha: number;
}

interface GlassStyle {
  style: React.CSSProperties;
  textClass: string;
  mutedClass: string;
  dividerClass: string;
  hoverClass: string;
}

function computeGlassStyle(g: GlassConfig, isLight: boolean): GlassStyle {
  const bgRgb = isLight ? "255, 255, 255" : "0, 0, 0";
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

export function FriendsMap() {
  const [styleKey, setStyleKey] = useState<StyleKey>("carto-dark");
  const [show3D, setShow3D] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);

  const isLight = LIGHT_STYLES.has(styleKey);

  const glassStyle = computeGlassStyle(
    {
      bgAlpha: 0.29,
      blurPx: 8,
      borderAlpha: 0,
      ringAlpha: 0,
      saturate: 0.7,
    },
    isLight,
  );

  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const userName = session.data?.user.name ?? session.data?.user.email?.split("@")[0] ?? "You";

  const [txns] = useQuery(queries.transactions.list());
  const [friendships] = useQuery(queries.social.friendships());
  const [allPosts] = useQuery(queries.social.postsAll());

  const friendIds = new Set(friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId)));
  const friendPosts = allPosts.filter((p) => p.userId !== userId && friendIds.has(p.userId));

  const geoTxns = txns.filter(
    (t): t is typeof t & { lat: number; lon: number } =>
      !t.excluded && t.source === "plaid" && typeof t.lat === "number" && typeof t.lon === "number",
  );

  const merchantTotalsMap: Record<
    string,
    {
      merchant: string;
      total: number;
      count: number;
      logoUrl: string | null;
      website: string | null;
    }
  > = {};
  for (const t of geoTxns) {
    const merchant = t.merchantName ?? t.name ?? "Unknown";
    const amt = Math.abs(Number(t.amount ?? 0));
    const existing = merchantTotalsMap[merchant];
    if (existing) {
      existing.total += amt;
      existing.count += 1;
    } else {
      merchantTotalsMap[merchant] = {
        count: 1,
        logoUrl: t.logoUrl ?? null,
        merchant,
        total: amt,
        website: t.website ?? null,
      };
    }
  }
  const merchantTotals = Object.values(merchantTotalsMap).toSorted((a, b) => b.total - a.total);

  const pins: PinDatum[] = geoTxns.map((t) => ({
    address: t.address ?? null,
    amount: Number(t.amount ?? 0),
    city: t.city ?? null,
    date: t.date,
    id: t.id,
    logoUrl: t.logoUrl ?? null,
    merchant: t.merchantName ?? t.name ?? "Unknown",
    notes: t.notes ?? null,
    person: userName,
    position: [t.lon, t.lat] as [number, number],
    region: t.region ?? null,
    website: t.website ?? null,
  }));

  // Friends' shared posts. Filter to ones w/ coords + drop my own posts
  // (already covered by `pins` from `transactions.list`).
  const friendPins: PinDatum[] = friendPosts
    .filter(
      (p): p is typeof p & { lat: number; lon: number } =>
        typeof p.lat === "number" && typeof p.lon === "number",
    )
    .map((p) => ({
      address: null,
      amount: p.amountCents === null ? 0 : Number(p.amountCents) / 100,
      city: null,
      date: typeof p.date === "number" ? p.date : null,
      id: p.id,
      logoUrl: null,
      merchant: p.merchantName,
      notes: p.note ?? null,
      person: `user ${p.userId.slice(0, 6)}`,
      position: [p.lon, p.lat] as [number, number],
      region: null,
      website: null,
    }));

  const layers = [
    show3D &&
      GOOGLE_3D_TILES_KEY &&
      new Tile3DLayer({
        data: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_3D_TILES_KEY}`,
        id: "google-3d-tiles",
        loader: Tiles3DLoader,
      }),
    new ScatterplotLayer<PinDatum>({
      data: pins,
      getFillColor: [255, 215, 0, 255],
      getLineColor: [0, 0, 0, 255],
      getPosition: (d) => [d.position[0], d.position[1], 0],
      getRadius: 20,
      id: "self-pins",
      lineWidthMinPixels: 2,
      onHover: ({ object, x, y }) => {
        setHover(object ? { pin: object as PinDatum, x, y } : null);
      },
      pickable: true,
      radiusMaxPixels: 40,
      radiusMinPixels: 10,
      radiusUnits: "pixels",
      stroked: true,
    }),
    new ScatterplotLayer<PinDatum>({
      data: friendPins,
      getFillColor: [16, 185, 129, 255],
      getLineColor: [0, 0, 0, 255],
      getPosition: (d) => [d.position[0], d.position[1], 0],
      getRadius: 22,
      id: "friend-pins",
      lineWidthMinPixels: 2,
      onHover: ({ object, x, y }) => {
        setHover(object ? { pin: object as PinDatum, x, y } : null);
      },
      pickable: true,
      radiusMaxPixels: 44,
      radiusMinPixels: 12,
      radiusUnits: "pixels",
      stroked: true,
    }),
  ].filter(Boolean);

  return (
    <div className="relative h-full w-full">
      <Map initialViewState={INITIAL_VIEW_STATE} mapStyle={MAP_STYLES[styleKey]?.url} reuseMaps>
        <DeckGLOverlay layers={layers as MapboxOverlayProps["layers"]} />
      </Map>
      <MerchantPanel merchants={merchantTotals} glassStyle={glassStyle} />
      {hover && <PinTooltip hover={hover} glassStyle={glassStyle} />}
      <StyleToggle
        active={styleKey}
        onChange={setStyleKey}
        show3D={show3D}
        on3DChange={setShow3D}
        has3DKey={Boolean(GOOGLE_3D_TILES_KEY)}
        glassStyle={glassStyle}
      />
    </div>
  );
}

interface MerchantTotal {
  merchant: string;
  total: number;
  count: number;
  logoUrl: string | null;
  website: string | null;
}

function MerchantPanel({
  merchants,
  glassStyle,
}: {
  merchants: MerchantTotal[];
  glassStyle: GlassStyle;
}) {
  const grandTotal = merchants.reduce((sum, m) => sum + m.total, 0);
  const top = merchants.slice(0, 20);
  const { style, textClass, mutedClass, dividerClass, hoverClass } = glassStyle;
  const isLight = textClass === "text-black";
  const muted = mutedClass;
  const divider = dividerClass;
  const rowHover = hoverClass;

  return (
    <div className="absolute left-4 top-4 z-10 w-72 max-w-[calc(100vw-2rem)]">
      <div className={`rounded-lg border ${textClass}`} style={style}>
        <div className={`flex items-baseline justify-between border-b px-4 py-3 ${divider}`}>
          <div>
            <div className="text-sm font-semibold">Top merchants</div>
            <div className={`text-[11px] ${muted}`}>
              {merchants.length} merchants · {top.length} shown
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold tabular-nums">${grandTotal.toFixed(0)}</div>
            <div className={`text-[10px] ${muted}`}>total</div>
          </div>
        </div>
        <div
          className={`max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ${
            isLight
              ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
              : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
          } [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full`}
        >
          {top.map((m) => (
            <div
              key={m.merchant}
              className={`flex items-center gap-3 px-4 py-2.5 transition ${rowHover}`}
            >
              <MerchantLogo
                counterparties={null}
                logoUrl={m.logoUrl}
                merchantName={m.merchant}
                website={m.website}
                className="size-7 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium leading-tight">{m.merchant}</div>
                <div className={`text-[10px] ${muted}`}>
                  {m.count} {m.count === 1 ? "txn" : "txns"}
                </div>
              </div>
              <div className="text-xs font-semibold tabular-nums">${m.total.toFixed(0)}</div>
            </div>
          ))}
          {merchants.length === 0 && (
            <div className={`px-4 py-6 text-center text-xs ${muted}`}>No transactions yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PinTooltip({ hover, glassStyle }: { hover: HoverState; glassStyle: GlassStyle }) {
  const { pin, x, y } = hover;
  const isOutflow = pin.amount < 0;
  const amount = `$${Math.abs(pin.amount).toFixed(2)}`;
  const { style, textClass, mutedClass, dividerClass } = glassStyle;
  const muted = mutedClass;
  const divider = dividerClass;
  const amountActive = isOutflow ? textClass : "text-emerald-500";
  const date = pin.date
    ? new Date(pin.date).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  const locationParts = [pin.address, pin.city, pin.region].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;
  const notes = pin.notes?.trim() ? pin.notes.trim() : null;
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: x + 12,
        top: y + 12,
      }}
    >
      <div className={`min-w-[220px] rounded-lg border p-3 ${textClass}`} style={style}>
        <div className="flex items-start gap-3">
          <MerchantLogo
            counterparties={null}
            logoUrl={pin.logoUrl}
            merchantName={pin.merchant}
            website={pin.website}
            className="size-9 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">{pin.merchant}</div>
            <div className={`mt-0.5 truncate text-xs ${muted}`}>{pin.person}</div>
          </div>
        </div>
        <div className={`mt-3 flex items-baseline justify-between border-t pt-2.5 ${divider}`}>
          <span className={`text-base font-semibold tabular-nums ${amountActive}`}>
            {isOutflow ? "-" : "+"}
            {amount}
          </span>
          {date && <span className={`text-[11px] ${muted}`}>{date}</span>}
        </div>
        {location && <div className={`mt-2 truncate text-[11px] ${muted}`}>{location}</div>}
        {notes && (
          <div
            className={`mt-2 max-h-24 overflow-hidden border-t pt-2 text-[11px] leading-relaxed italic ${divider}`}
          >
            {notes}
          </div>
        )}
      </div>
    </div>
  );
}

function StyleToggle({
  active,
  onChange,
  show3D,
  on3DChange,
  has3DKey,
  glassStyle,
}: {
  active: StyleKey;
  onChange: (k: StyleKey) => void;
  show3D: boolean;
  on3DChange: (v: boolean) => void;
  has3DKey: boolean;
  glassStyle: GlassStyle;
}) {
  const isLight = glassStyle.textClass === "text-black";
  const { style, textClass, dividerClass } = glassStyle;
  const activeBtn = isLight ? "bg-black text-white" : "bg-white text-black";
  const idleBtn = isLight ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10";
  const divider = dividerClass;

  return (
    <div
      className={`absolute right-4 top-4 z-10 flex max-h-[calc(100vh-2rem)] flex-col gap-1 overflow-y-auto rounded-lg border p-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] ${textClass} ${
        isLight
          ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
          : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
      }`}
      style={style}
    >
      {(Object.keys(MAP_STYLES) as StyleKey[]).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded px-3 py-1 text-xs font-medium transition ${
            active === key ? activeBtn : idleBtn
          }`}
        >
          {MAP_STYLES[key]?.label}
        </button>
      ))}
      {has3DKey && (
        <button
          type="button"
          onClick={() => on3DChange(!show3D)}
          className={`mt-1 rounded border-t px-3 py-1 text-xs font-medium transition ${divider} ${
            show3D ? activeBtn : idleBtn
          }`}
        >
          3D Buildings
        </button>
      )}
    </div>
  );
}
