import { MapboxOverlay } from "@deck.gl/mapbox";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import { IconLayer } from "@deck.gl/layers";
import { queries } from "@cobalt-web/zero";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import {
  CATEGORY_SYSTEM_ICON_SRC,
  pfcDetailedToSystemKey,
} from "@cobalt-web/ui/cobalt/transactions/categories/index";
import { TransactionDetailSummary } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail-summary";
import { mapZeroTransactionDetailRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useQuery } from "@rocicorp/zero/react";
import { Map as MapGL, Source, Layer, useControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { authClient } from "../lib/auth-client";
import { getAvatarIcon } from "./avatar-icon";
import { buildSvgAtlas } from "./svg-atlas";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
const SERVER_URL = import.meta.env.VITE_SERVER_URL as string | undefined;
const avatarProxyUrl = (uid: string) =>
  SERVER_URL ? `${SERVER_URL.replace(/\/$/, "")}/api/avatar/${uid}` : null;

// Stack key = merchant name + ~1km coord bucket. Pure coord rounding misses
// repeat visits because Plaid lat/lng can drift tens of meters between txns
// at the same shop; pure merchant name would merge "Chipotle SF" with
// "Chipotle NYC". The combo groups repeat visits at one location.
function stackKeyForPin(p: { merchant: string; position: [number, number] }): string {
  return `${p.merchant}|${p.position[0].toFixed(2)},${p.position[1].toFixed(2)}`;
}

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

// Filter bucket = Plaid PFC detailed → systemKey. Keeps panel 1:1 with icons.
type Category = string;

type ViewMode = "pins" | "people";
type MarkerStyle = "dots" | "landmark";

type TimeWindow = 7 | 30 | 90 | 0;

interface PinDatum {
  id: string;
  position: [number, number];
  merchant: string;
  amount: number;
  person: string;
  userId: string;
  category: Category;
  paymentChannel: string | null;
  date: string | number | null;
  logoUrl: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  notes: string | null;
}

const CATEGORY_LABEL_OVERRIDES: Record<string, string> = {
  alcohol_bars: "Bars",
  coffee_shop: "Coffee",
  food_delivery: "Delivery",
  gas_fuel: "Gas",
  pharmacy: "Pharmacy",
  public_transit: "Transit",
  uncategorized: "Other",
};

function categoryLabel(key: string): string {
  if (CATEGORY_LABEL_OVERRIDES[key]) {
    return CATEGORY_LABEL_OVERRIDES[key];
  }
  return key
    .split("_")
    .map((w) => (w ? (w[0] ?? "").toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function categoryIconSrc(key: string): string {
  const map = CATEGORY_SYSTEM_ICON_SRC as Record<string, string | undefined>;
  return map[key] ?? map.uncategorized ?? "";
}

// Drizzle returns `timestamp` columns as Date objects, but `Date` doesn't
// survive the wire to friends (Zero serializes). Accept anything that
// `new Date(x)` understands.
function normalizePostDate(d: unknown): number | string | null {
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

function withinWindow(date: string | number | null, days: TimeWindow): boolean {
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

// MTA Subway Service Lines (data.ny.gov dataset s692-irgq).
// `service` property = route id (e.g. "1","A","L"). ~8MB; loaded on demand.
const NYC_SUBWAY_URL = "https://data.ny.gov/api/geospatial/s692-irgq?method=export&format=GeoJSON";

// Official MTA route colors. https://web.mta.info/developers/resources/line_colors.htm
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUBWAY_LINE_COLOR_EXPR: any = [
  "match",
  ["get", "service"],
  "1",
  "#EE352E",
  "2",
  "#EE352E",
  "3",
  "#EE352E",
  "4",
  "#00933C",
  "5",
  "#00933C",
  "6",
  "#00933C",
  "7",
  "#B933AD",
  "A",
  "#2850AD",
  "C",
  "#2850AD",
  "E",
  "#2850AD",
  "B",
  "#FF6319",
  "D",
  "#FF6319",
  "F",
  "#FF6319",
  "M",
  "#FF6319",
  "G",
  "#6CBE45",
  "J",
  "#996633",
  "Z",
  "#996633",
  "L",
  "#A7A9AC",
  "N",
  "#FCCC0A",
  "Q",
  "#FCCC0A",
  "R",
  "#FCCC0A",
  "W",
  "#FCCC0A",
  "S",
  "#808183",
  "T",
  "#00ADD0",
  "#666666",
];

function NycSubwayLines() {
  return (
    <Source id="nyc-subway" type="geojson" data={NYC_SUBWAY_URL}>
      <Layer
        id="nyc-subway-line"
        type="line"
        paint={{
          "line-color": SUBWAY_LINE_COLOR_EXPR,
          "line-opacity": 0.85,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 3, 18, 6],
        }}
        layout={{ "line-cap": "round", "line-join": "round" }}
      />
    </Source>
  );
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

interface PersonAgg {
  userId: string;
  name: string;
  total: number;
  count: number;
  lat: number;
  lon: number;
  byCat: Record<string, number>;
}

function aggregatePeople(allPins: PinDatum[]): PersonAgg[] {
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
    } else {
      personAgg.set(p.userId, {
        byCat: { [p.category]: amt },
        count: 1,
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

// eslint-disable-next-line complexity
export function FriendsMap() {
  const [styleKey, setStyleKey] = useState<StyleKey>("carto-dark");
  const [showSubway, setShowSubway] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [stackKey, setStackKey] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const flyTo = (lon: number, lat: number) => {
    mapRef.current?.flyTo({ center: [lon, lat], duration: 1200, essential: true, zoom: 16 });
  };
  const [viewMode, setViewMode] = useState<ViewMode>("pins");
  const [markerStyle, setMarkerStyle] = useState<MarkerStyle>("landmark");
  // Bumped whenever an async avatar canvas finishes loading so IconLayer's
  // `updateTriggers` knows to re-read getIcon and pick up the new data URL.
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(30);
  // null = no explicit filter (all pins pass). Once user toggles a bucket off
  // we snapshot the currently-present systemKeys and switch to explicit mode.
  const [activeCategories, setActiveCategories] = useState<Set<Category> | null>(null);
  // Friends hidden from the map. Default = all visible. Toggled via the
  // Friends section in InspectorPanel.
  const [hiddenFriendIds, setHiddenFriendIds] = useState<Set<string>>(() => new Set());

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

  // Two atlases — flat disc tiles for the "dots" style, teardrop tiles
  // (matching the people-avatar shape) for the "landmark" style. Both keyed
  // on CategorySystemKey so the IconLayer mapping resolves either way.
  const [svgAtlas, setSvgAtlas] = useState<Awaited<ReturnType<typeof buildSvgAtlas>>>(null);
  const [svgAtlasTeardrop, setSvgAtlasTeardrop] =
    useState<Awaited<ReturnType<typeof buildSvgAtlas>>>(null);
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const items = Object.entries(CATEGORY_SYSTEM_ICON_SRC).map(([key, src]) => ({ key, src }));
      const [circle, teardrop] = await Promise.all([
        buildSvgAtlas(items, "circle"),
        buildSvgAtlas(items, "teardrop"),
      ]);
      if (!cancelled) {
        setSvgAtlas(circle);
        setSvgAtlasTeardrop(teardrop);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const [txns] = useQuery(queries.transactions.list());
  const [friendships] = useQuery(queries.social.friendships());
  const [allPosts] = useQuery(queries.social.postsAll());

  const friendIds = new Set(friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId)));
  // Stable list for the Friends toggle UI — self first (gold), then every
  // accepted friendship (orange), even ones with zero shared posts so users
  // can pre-mute a new friend.
  const friendList = [
    { id: userId ?? "self", isSelf: true as const, label: userName },
    ...[...friendIds].map((id) => ({
      id,
      isSelf: false as const,
      label: `user ${id.slice(0, 6)}`,
    })),
  ];
  const friendPosts = allPosts.filter(
    (p) => p.userId !== userId && friendIds.has(p.userId) && !hiddenFriendIds.has(p.userId),
  );

  const geoTxns = txns.filter(
    (t): t is typeof t & { lat: number; lon: number } =>
      !t.excluded && t.source === "plaid" && typeof t.lat === "number" && typeof t.lon === "number",
  );

  // In-store Plaid txns without lat/lon — surfaced in UnmappedPanel beside the map.
  const unmappedInStore = txns.filter(
    (t) =>
      !t.excluded &&
      t.source === "plaid" &&
      t.paymentChannel === "in store" &&
      (typeof t.lat !== "number" || typeof t.lon !== "number"),
  );

  // Merchant totals computed after data definitions below.

  const selfPinsRaw: PinDatum[] = geoTxns.map((t) => {
    const merchant = t.merchantName ?? t.name ?? "Unknown";
    return {
      address: t.address ?? null,
      amount: Number(t.amount ?? 0),
      category: pfcDetailedToSystemKey(t.pfcDetailed ?? null),
      city: t.city ?? null,
      date: t.date,
      id: t.id,
      logoUrl: t.logoUrl ?? null,
      merchant,
      notes: t.notes ?? null,
      paymentChannel: t.paymentChannel ?? null,
      person: userName,
      position: [t.lon, t.lat] as [number, number],
      region: t.region ?? null,
      userId: userId ?? "self",
      website: t.website ?? null,
    };
  });

  const friendPinsRaw: PinDatum[] = friendPosts
    .filter(
      (p): p is typeof p & { lat: number; lon: number } =>
        typeof p.lat === "number" && typeof p.lon === "number",
    )
    .map((p) => ({
      address: null,
      amount: p.amountCents === null ? 0 : Number(p.amountCents) / 100,
      category: "uncategorized",
      city: null,
      date: normalizePostDate(p.date),
      id: p.id,
      logoUrl: null,
      merchant: p.merchantName,
      notes: p.note ?? null,
      paymentChannel: null,
      person: `user ${p.userId.slice(0, 6)}`,
      position: [p.lon, p.lat] as [number, number],
      region: null,
      userId: p.userId,
      website: null,
    }));

  const passesFilter = (p: PinDatum) =>
    (activeCategories === null || activeCategories.has(p.category)) &&
    withinWindow(p.date, timeWindow);

  const selfHidden = userId ? hiddenFriendIds.has(userId) : false;
  const pins = selfHidden ? [] : selfPinsRaw.filter(passesFilter);
  const friendPins = friendPinsRaw.filter(passesFilter);
  const allPins = [...pins, ...friendPins];

  // Categories with ≥1 in-store pin inside the current time window — drives
  // the filter UI so options track 7d/30d/90d/all.
  const presentCategories = new Set<Category>();
  for (const p of [...selfPinsRaw, ...friendPinsRaw]) {
    if (p.paymentChannel === "in store" && withinWindow(p.date, timeWindow)) {
      presentCategories.add(p.category);
    }
  }

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
  for (const p of allPins) {
    const amt = Math.abs(p.amount);
    const existing = merchantTotalsMap[p.merchant];
    if (existing) {
      existing.total += amt;
      existing.count += 1;
    } else {
      merchantTotalsMap[p.merchant] = {
        count: 1,
        logoUrl: p.logoUrl,
        merchant: p.merchant,
        total: amt,
        website: p.website,
      };
    }
  }
  const merchantTotals = Object.values(merchantTotalsMap).toSorted((a, b) => b.total - a.total);

  const people = aggregatePeople(allPins);

  const layers: unknown[] = [];

  // Identity color (gold = you, orange = friend) used by People style.
  const colorForUser = (uid: string): [number, number, number, number] =>
    uid === userId ? [255, 215, 0, 230] : [251, 146, 60, 230];
  const openSelfTxn = (id: string | null) => {
    if (!id) {
      setSelectedTxnId(null);
      setStackKey(null);
      return;
    }
    const pin = allPins.find((p) => p.id === id);
    setSelectedTxnId(id);
    setStackKey(pin ? stackKeyForPin(pin) : null);
  };
  const pinClickHandler = (object: unknown) => {
    if (!object) {
      return;
    }
    const p = object as PinDatum;
    flyTo(p.position[0], p.position[1]);
    const key = stackKeyForPin(p);
    const atCoord = allPins.filter((x) => stackKeyForPin(x) === key);
    setStackKey(key);
    if (p.userId === userId) {
      setSelectedTxnId(p.id);
    } else {
      const selfAt = atCoord.find((x) => x.userId === userId);
      if (selfAt) {
        setSelectedTxnId(selfAt.id);
      }
    }
  };
  const pinHoverHandler = (info: { object?: unknown; x: number; y: number }) => {
    setHover(info.object ? { pin: info.object as PinDatum, x: info.x, y: info.y } : null);
  };

  if (markerStyle === "dots") {
    if (viewMode === "pins" && svgAtlas) {
      layers.push(
        new IconLayer<PinDatum>({
          alphaCutoff: 0.05,
          billboard: true,
          data: allPins,
          getColor: [255, 255, 255, 255],
          getIcon: (d) => (d.category in svgAtlas.mapping ? d.category : "uncategorized"),
          getPosition: (d) => [d.position[0], d.position[1], 0.01],
          getSize: 32,
          iconAtlas: svgAtlas.url,
          iconMapping: svgAtlas.mapping,
          id: "self-pins",
          onClick: ({ object }) => pinClickHandler(object),
          onHover: pinHoverHandler,
          pickable: true,
          sizeMaxPixels: 520,
          sizeMinPixels: 28,
          sizeUnits: "meters",
        }),
      );
    } else if (viewMode === "people") {
      // People dots: render profile pic in circle with identity-colored ring.
      const avatarFor = (d: PinDatum) => {
        const isSelf = d.userId === userId;
        const initial = (isSelf ? userName : d.person).charAt(0) || "?";
        const url = avatarProxyUrl(d.userId);
        const dataUrl = getAvatarIcon(
          {
            fallbackInitial: initial,
            key: d.userId,
            ring: colorForUser(d.userId),
            shape: "circle",
            url,
          },
          () => setAvatarVersion((v) => v + 1),
        );
        return {
          anchorX: 80,
          anchorY: 80,
          height: 160,
          id: `${d.userId}-circle-${avatarVersion}`,
          url: dataUrl,
          width: 160,
        } as const;
      };
      layers.push(
        new IconLayer<PinDatum>({
          alphaCutoff: 0.05,
          billboard: true,
          data: allPins,
          getColor: [255, 255, 255, 255],
          getIcon: avatarFor,
          getPosition: (d) => [d.position[0], d.position[1], 0],
          getSize: 24,
          id: "people-pins",
          onClick: ({ object }) => pinClickHandler(object),
          onHover: pinHoverHandler,
          pickable: true,
          sizeMaxPixels: 410,
          sizeMinPixels: 22,
          sizeUnits: "meters",
          updateTriggers: { getIcon: avatarVersion },
        }),
      );
    }
  } else if (markerStyle === "landmark") {
    const landmarkAtlas = svgAtlasTeardrop ?? svgAtlas;
    if (viewMode === "pins" && landmarkAtlas) {
      layers.push(
        new IconLayer<PinDatum>({
          alphaCutoff: 0.05,
          billboard: true,
          data: allPins,
          getColor: [255, 255, 255, 255],
          getIcon: (d) => (d.category in landmarkAtlas.mapping ? d.category : "uncategorized"),
          getPosition: (d) => [d.position[0], d.position[1], 0],
          getSize: 30,
          iconAtlas: landmarkAtlas.url,
          iconMapping: landmarkAtlas.mapping,
          id: "category-landmarks",
          onClick: ({ object }) => pinClickHandler(object),
          onHover: pinHoverHandler,
          pickable: true,
          sizeMaxPixels: 400,
          sizeMinPixels: 40,
          sizeUnits: "meters",
        }),
      );
    } else if (viewMode === "people") {
      // Each pin = circular avatar tile pre-baked via canvas: profile pic
      // (if `user.image` present) clipped to a circle, with identity-colored
      // ring border. Falls back to lettermark (first initial in the ring) so
      // friends with no public image still read at a glance.
      const avatarFor = (d: PinDatum) => {
        const isSelf = d.userId === userId;
        const initial = (isSelf ? userName : d.person).charAt(0) || "?";
        const url = avatarProxyUrl(d.userId);
        const dataUrl = getAvatarIcon(
          {
            fallbackInitial: initial,
            key: d.userId,
            ring: colorForUser(d.userId),
            url,
          },
          () => setAvatarVersion((v) => v + 1),
        );
        // 128×160 teardrop. Anchor at the tail tip (bottom center) so the
        // point lands on the geographic coord rather than the head center.
        return {
          anchorX: 64,
          anchorY: 160,
          height: 160,
          id: `${d.userId}-${avatarVersion}`,
          url: dataUrl,
          width: 128,
        } as const;
      };
      layers.push(
        new IconLayer<PinDatum>({
          alphaCutoff: 0.05,
          billboard: true,
          data: allPins,
          getColor: [255, 255, 255, 255],
          getIcon: avatarFor,
          getPosition: (d) => [d.position[0], d.position[1], 0],
          getSize: 30,
          id: "people-avatars",
          onClick: ({ object }) => pinClickHandler(object),
          onHover: pinHoverHandler,
          pickable: true,
          sizeMaxPixels: 400,
          sizeMinPixels: 40,
          sizeUnits: "meters",
          updateTriggers: { getIcon: avatarVersion },
        }),
      );
    }
  }

  return (
    <div className="relative h-full w-full">
      <MapGL
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLES[styleKey]?.url}
        reuseMaps
      >
        {showSubway && <NycSubwayLines />}
        <DeckGLOverlay layers={layers as MapboxOverlayProps["layers"]} />
      </MapGL>
      {viewMode === "people" ? (
        <PeopleLeaderboard
          people={people}
          categories={activeCategories}
          glassStyle={glassStyle}
          selfId={userId}
        />
      ) : (
        <MerchantPanel
          merchants={merchantTotals}
          unmappedTxns={unmappedInStore}
          inStorePins={allPins}
          flyTo={flyTo}
          selfId={userId}
          onSelectTxn={openSelfTxn}
          glassStyle={glassStyle}
        />
      )}
      {(() => {
        const hoverSelf = hover && hover.pin.userId === userId ? hover.pin : null;
        const displayTxnId = hoverSelf?.id ?? selectedTxnId ?? null;
        if (!displayTxnId) {
          return null;
        }
        const mode: "pinned" | "preview" = hoverSelf ? "preview" : "pinned";
        const key = hoverSelf ? stackKeyForPin(hoverSelf) : stackKey;
        const selfStack = key
          ? allPins.filter((p) => stackKeyForPin(p) === key && p.userId === userId)
          : [];
        return (
          <TxnDetailPanel
            txnId={displayTxnId}
            mode={mode}
            onClose={() => {
              setSelectedTxnId(null);
              setStackKey(null);
            }}
            glassStyle={glassStyle}
            stack={selfStack.length > 0 ? selfStack : null}
            selfId={userId}
            onNavigate={(p) => {
              flyTo(p.position[0], p.position[1]);
              setSelectedTxnId(p.id);
            }}
          />
        );
      })()}
      <InspectorPanel
        viewMode={viewMode}
        onViewMode={setViewMode}
        markerStyle={markerStyle}
        onMarkerStyle={setMarkerStyle}
        timeWindow={timeWindow}
        onTimeWindow={setTimeWindow}
        friends={friendList}
        hiddenFriendIds={hiddenFriendIds}
        onToggleFriend={(id) => {
          setHiddenFriendIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
              next.delete(id);
            } else {
              next.add(id);
            }
            return next;
          });
        }}
        activeCategories={activeCategories}
        presentCategories={presentCategories}
        onToggleCategory={(c) => {
          // Multi-select: clicking toggles the category in/out of the active
          // set. First toggle snapshots the currently-visible categories so
          // un-checking removes only the clicked one; toggling back to all
          // present returns to "no filter" (null).
          setActiveCategories((prev) => {
            const base = prev ?? new Set(presentCategories);
            const next = new Set(base);
            if (next.has(c)) {
              next.delete(c);
            } else {
              next.add(c);
            }
            if (
              next.size === presentCategories.size &&
              [...presentCategories].every((p) => next.has(p))
            ) {
              return null;
            }
            return next;
          });
        }}
        styleKey={styleKey}
        onStyleKey={setStyleKey}
        showSubway={showSubway}
        onSubwayChange={setShowSubway}
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
  const q = inStoreQuery.trim().toLowerCase();
  const sortedInStore = inStorePins
    .filter((p) =>
      q === ""
        ? true
        : p.merchant.toLowerCase().includes(q) ||
          (p.city ?? "").toLowerCase().includes(q) ||
          (p.region ?? "").toLowerCase().includes(q),
    )
    .toSorted((a, b) => {
      const tA = a.date ? new Date(a.date).getTime() : 0;
      const tB = b.date ? new Date(b.date).getTime() : 0;
      return tB - tA;
    });
  const [topQuery, setTopQuery] = useState("");
  const tq = topQuery.trim().toLowerCase();
  const filteredMerchants = merchants.filter((m) =>
    tq === "" ? true : m.merchant.toLowerCase().includes(tq),
  );
  const top = filteredMerchants.slice(0, 20);
  const { style, textClass, mutedClass, dividerClass, hoverClass } = glassStyle;
  const isLight = textClass === "text-black";
  const activeTab = isLight ? "bg-black text-white" : "bg-white text-black";
  const idleTab = isLight ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10";
  const [unmappedQuery, setUnmappedQuery] = useState("");
  const uq = unmappedQuery.trim().toLowerCase();
  const filteredUnmapped = unmappedTxns.filter((t) => {
    if (uq === "") {
      return true;
    }
    const m = (t.merchantName ?? t.name ?? "").toLowerCase();
    return (
      m.includes(uq) ||
      (t.city ?? "").toLowerCase().includes(uq) ||
      (t.region ?? "").toLowerCase().includes(uq)
    );
  });
  const sortedUnmapped = filteredUnmapped.toSorted((a, b) => {
    const tA = a.date ? new Date(a.date).getTime() : 0;
    const tB = b.date ? new Date(b.date).getTime() : 0;
    return tB - tA;
  });

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
          <>
            <div className={`border-b px-3 py-2 ${dividerClass}`}>
              <input
                aria-label="Search in-store merchants"
                type="text"
                value={inStoreQuery}
                onChange={(e) => setInStoreQuery(e.target.value)}
                placeholder="Search merchant, city…"
                className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none ${
                  isLight
                    ? "bg-black/5 placeholder:text-black/40 text-black focus:bg-black/10"
                    : "bg-white/5 placeholder:text-white/40 text-white focus:bg-white/10"
                }`}
              />
            </div>
            <div
              className={`max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ${
                isLight
                  ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
                  : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
              } [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full`}
            >
              {sortedInStore.map((p) => {
                const isOutflow = p.amount < 0;
                const dateStr = p.date
                  ? new Date(p.date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  : "";
                const locParts = [p.city, p.region].filter(Boolean) as string[];
                const loc = locParts.join(", ");
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
                    <div
                      className={`text-sm font-semibold tabular-nums ${isOutflow ? "text-destructive" : "text-success"}`}
                    >
                      ${Math.abs(p.amount).toFixed(0)}
                    </div>
                  </button>
                );
              })}
              {sortedInStore.length === 0 && (
                <div className={`px-4 py-6 text-center text-sm ${mutedClass}`}>
                  No in-store transactions
                </div>
              )}
            </div>
          </>
        )}
        {tab === "top" && (
          <>
            <div className={`border-b px-3 py-2 ${dividerClass}`}>
              <input
                aria-label="Search top merchants"
                type="text"
                value={topQuery}
                onChange={(e) => setTopQuery(e.target.value)}
                placeholder="Search merchant…"
                className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none ${
                  isLight
                    ? "bg-black/5 placeholder:text-black/40 text-black focus:bg-black/10"
                    : "bg-white/5 placeholder:text-white/40 text-white focus:bg-white/10"
                }`}
              />
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
                <div className={`px-4 py-6 text-center text-sm ${mutedClass}`}>
                  No transactions yet
                </div>
              )}
            </div>
          </>
        )}
        {tab === "unmapped" && (
          <>
            <div className={`border-b px-3 py-2 ${dividerClass}`}>
              <input
                aria-label="Search unmapped merchants"
                type="text"
                value={unmappedQuery}
                onChange={(e) => setUnmappedQuery(e.target.value)}
                placeholder="Search merchant, city…"
                className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none ${
                  isLight
                    ? "bg-black/5 placeholder:text-black/40 text-black focus:bg-black/10"
                    : "bg-white/5 placeholder:text-white/40 text-white focus:bg-white/10"
                }`}
              />
            </div>
            <div
              className={`max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ${
                isLight
                  ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
                  : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
              } [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full`}
            >
              {sortedUnmapped.map((t) => {
                const merchant = t.merchantName ?? t.name ?? "Unknown";
                const amt = Number(t.amount ?? 0);
                const isOutflow = amt < 0;
                const dateStr = t.date
                  ? new Date(t.date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })
                  : "";
                const locParts = [t.city, t.region].filter(Boolean) as string[];
                const loc = locParts.join(", ");
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
                    <div
                      className={`text-sm font-semibold tabular-nums ${isOutflow ? "text-destructive" : "text-success"}`}
                    >
                      ${Math.abs(amt).toFixed(0)}
                    </div>
                  </button>
                );
              })}
              {sortedUnmapped.length === 0 && (
                <div className={`px-4 py-6 text-center text-sm ${mutedClass}`}>
                  All in-store transactions have location data 🎉
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface UnmappedTxn {
  id: string;
  merchantName: string | null;
  name: string | null;
  amount: number | string | null;
  date: string | number | null;
  address: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  website: string | null;
}

function InspectorSection({
  title,
  children,
  isLight,
  dividerClass,
  mutedClass,
}: {
  title: string;
  children: React.ReactNode;
  isLight: boolean;
  dividerClass: string;
  mutedClass: string;
}) {
  void isLight;
  return (
    <div className={`border-b px-4 py-3 ${dividerClass}`}>
      <div className={`mb-2 text-[11px] font-semibold uppercase tracking-wider ${mutedClass}`}>
        {title}
      </div>
      {children}
    </div>
  );
}

function SegmentedRow<T extends string | number>({
  options,
  value,
  onChange,
  activeBtn,
  idleBtn,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  activeBtn: string;
  idleBtn: string;
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded px-2 py-1.5 text-sm font-semibold transition ${value === o.key ? activeBtn : idleBtn}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function InspectorPanel({
  viewMode,
  onViewMode,
  markerStyle,
  onMarkerStyle,
  timeWindow,
  onTimeWindow,
  friends,
  hiddenFriendIds,
  onToggleFriend,
  activeCategories,
  presentCategories,
  onToggleCategory,
  styleKey,
  onStyleKey,
  showSubway,
  onSubwayChange,
  glassStyle,
}: {
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  markerStyle: MarkerStyle;
  onMarkerStyle: (s: MarkerStyle) => void;
  timeWindow: TimeWindow;
  onTimeWindow: (w: TimeWindow) => void;
  friends: { id: string; label: string; isSelf: boolean }[];
  hiddenFriendIds: Set<string>;
  onToggleFriend: (id: string) => void;
  activeCategories: Set<Category> | null;
  presentCategories: Set<Category>;
  onToggleCategory: (c: Category) => void;
  styleKey: StyleKey;
  onStyleKey: (k: StyleKey) => void;
  showSubway: boolean;
  onSubwayChange: (v: boolean) => void;
  glassStyle: GlassStyle;
}) {
  const isLight = glassStyle.textClass === "text-black";
  const { style, textClass, dividerClass, mutedClass } = glassStyle;
  const activeBtn = isLight ? "bg-black text-white" : "bg-white text-black";
  const idleBtn = isLight ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10";
  const allCats = [...presentCategories].toSorted((a, b) =>
    categoryLabel(a).localeCompare(categoryLabel(b)),
  );

  return (
    <div
      className={`absolute right-4 top-4 z-10 flex w-64 max-h-[calc(100vh-2rem)] flex-col overflow-y-auto rounded-2xl border [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] ${textClass} ${
        isLight
          ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
          : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
      }`}
      style={style}
    >
      <InspectorSection
        title="View"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <SegmentedRow<ViewMode>
          options={[
            { key: "pins", label: "Categories" },
            { key: "people", label: "People" },
          ]}
          value={viewMode}
          onChange={onViewMode}
          activeBtn={activeBtn}
          idleBtn={idleBtn}
        />
      </InspectorSection>

      <InspectorSection
        title="Marker"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <SegmentedRow<MarkerStyle>
          options={[
            { key: "dots", label: "Dots" },
            { key: "landmark", label: "Landmark" },
          ]}
          value={markerStyle}
          onChange={onMarkerStyle}
          activeBtn={activeBtn}
          idleBtn={idleBtn}
        />
      </InspectorSection>

      <InspectorSection
        title="Range"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <SegmentedRow<TimeWindow>
          options={[
            { key: 7, label: "7d" },
            { key: 30, label: "30d" },
            { key: 90, label: "90d" },
            { key: 0, label: "All" },
          ]}
          value={timeWindow}
          onChange={onTimeWindow}
          activeBtn={activeBtn}
          idleBtn={idleBtn}
        />
      </InspectorSection>

      <InspectorSection
        title="Categories"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <div className="flex flex-col gap-1">
          {allCats.map((c) => {
            const on = activeCategories === null || activeCategories.has(c);
            const label = categoryLabel(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => onToggleCategory(c)}
                className={`flex items-center justify-between rounded px-2 py-1 text-xs font-medium transition ${idleBtn} ${on ? "" : "opacity-40"}`}
                title={label}
              >
                <span className="flex items-center gap-2">
                  <img
                    src={categoryIconSrc(c)}
                    alt=""
                    aria-hidden
                    className="size-4 object-contain"
                  />
                  {label}
                </span>
                <span className="w-3 text-center opacity-80">{on ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      </InspectorSection>

      <InspectorSection
        title="Friends"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        {friends.length === 0 ? (
          <p className={`text-xs ${mutedClass}`}>No friends yet. Send an invite.</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="mb-1 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  for (const f of friends) {
                    if (hiddenFriendIds.has(f.id)) {
                      onToggleFriend(f.id);
                    }
                  }
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${idleBtn}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  for (const f of friends) {
                    if (!hiddenFriendIds.has(f.id)) {
                      onToggleFriend(f.id);
                    }
                  }
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${idleBtn}`}
              >
                None
              </button>
            </div>
            {friends.map((f) => {
              const on = !hiddenFriendIds.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onToggleFriend(f.id)}
                  className={`flex items-center justify-between rounded px-2 py-1 text-xs font-medium transition ${idleBtn} ${on ? "" : "opacity-40"}`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{
                        backgroundColor: f.isSelf ? "rgb(255, 215, 0)" : "rgb(251, 146, 60)",
                      }}
                    />
                    {f.label}
                    {f.isSelf ? <span className="opacity-60">(you)</span> : null}
                  </span>
                  <span className="w-3 text-center opacity-80">{on ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        )}
      </InspectorSection>

      <InspectorSection
        title="Map Style"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <select
          value={styleKey}
          onChange={(e) => onStyleKey(e.target.value as StyleKey)}
          className={`w-full rounded px-2 py-1.5 text-sm font-medium ${idleBtn} ${isLight ? "bg-black/5" : "bg-white/5"} outline-none`}
        >
          {(Object.keys(MAP_STYLES) as StyleKey[]).map((key) => (
            <option key={key} value={key} className="bg-black text-white">
              {MAP_STYLES[key]?.label}
            </option>
          ))}
        </select>
      </InspectorSection>

      <InspectorSection
        title="Layers"
        isLight={isLight}
        dividerClass={dividerClass}
        mutedClass={mutedClass}
      >
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onSubwayChange(!showSubway)}
            className={`w-full rounded px-3 py-1.5 text-sm font-semibold transition ${showSubway ? activeBtn : idleBtn}`}
          >
            🚇 NYC Subway {showSubway ? "·  On" : "·  Off"}
          </button>
        </div>
      </InspectorSection>
    </div>
  );
}

function PeopleLeaderboard({
  people,
  categories,
  glassStyle,
  selfId,
}: {
  people: PersonAgg[];
  categories: Set<Category> | null;
  glassStyle: GlassStyle;
  selfId: string | undefined;
}) {
  const { style, textClass, mutedClass, dividerClass } = glassStyle;
  // Surface every systemKey present in any person's byCat — categories prop
  // narrows to active filter when present.
  const presentInPeople = new Set<Category>();
  for (const p of people) {
    for (const k of Object.keys(p.byCat)) {
      if (categories === null || categories.has(k)) {
        presentInPeople.add(k);
      }
    }
  }
  const visibleCats = [...presentInPeople].toSorted((a, b) =>
    categoryLabel(a).localeCompare(categoryLabel(b)),
  );
  const topOverall = people.toSorted((a, b) => b.total - a.total).slice(0, 10);

  const topByCat: { cat: Category; person: PersonAgg | null; amount: number }[] = visibleCats.map(
    (cat) => {
      let best: PersonAgg | null = null;
      let bestAmt = 0;
      for (const p of people) {
        const a = p.byCat[cat] ?? 0;
        if (a > bestAmt) {
          best = p;
          bestAmt = a;
        }
      }
      return { amount: bestAmt, cat, person: best };
    },
  );

  return (
    <div className="absolute left-4 top-4 z-10 w-80 max-w-[calc(100vw-2rem)]">
      <div className={`rounded-2xl border ${textClass}`} style={style}>
        <div className={`border-b px-4 py-3 ${dividerClass}`}>
          <div className="text-base font-semibold">Crew leaderboard</div>
        </div>
        <div className={`border-b px-4 py-2 ${dividerClass}`}>
          {topOverall.map((p, i) => (
            <div key={p.userId} className="flex items-center gap-3 py-1.5">
              <div className={`w-5 text-center text-xs tabular-nums ${mutedClass}`}>#{i + 1}</div>
              <div className="min-w-0 flex-1 truncate text-sm font-medium">
                {p.name}
                {p.userId === selfId && (
                  <span className={`ml-1 text-[11px] ${mutedClass}`}>(you)</span>
                )}
              </div>
              <div className="text-sm font-semibold tabular-nums">${p.total.toFixed(0)}</div>
            </div>
          ))}
          {topOverall.length === 0 && (
            <div className={`py-3 text-center text-sm ${mutedClass}`}>No data in range</div>
          )}
        </div>
        <div className="px-4 py-2">
          <div className={`mb-1 text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>
            Category champions
          </div>
          {topByCat.map(({ cat, person, amount }) => (
            <div key={cat} className="flex items-center gap-2 py-1">
              <img
                src={categoryIconSrc(cat)}
                alt=""
                aria-hidden
                className="size-4 object-contain"
              />
              <span className="w-20 text-sm">{categoryLabel(cat)}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {person ? person.name : <span className={mutedClass}>—</span>}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {amount > 0 ? `$${amount.toFixed(0)}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TxnDetailPanel({
  txnId,
  mode,
  onClose,
  glassStyle,
  stack,
  selfId,
  onNavigate,
}: {
  txnId: string;
  mode: "pinned" | "preview";
  onClose: () => void;
  glassStyle: GlassStyle;
  stack: PinDatum[] | null;
  selfId: string | undefined;
  onNavigate: (p: PinDatum) => void;
}) {
  const { style, textClass, mutedClass } = glassStyle;
  const isLight = textClass === "text-black";
  const [row] = useQuery(queries.transactions.detail({ transactionId: txnId }));
  const mapped = row ? mapZeroTransactionDetailRow(row) : null;
  const transaction = mapped?.transaction ?? null;
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    setOffset((prev) => ({ x: prev.x + e.delta.x, y: prev.y + e.delta.y }));
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <DraggableTxnPanel
        offset={offset}
        mode={mode}
        onClose={onClose}
        textClass={textClass}
        style={style}
        isLight={isLight}
        mutedClass={mutedClass}
        transaction={transaction}
        stack={stack}
        selfId={selfId}
        currentId={txnId}
        onNavigate={onNavigate}
      />
    </DndContext>
  );
}

function DraggableTxnPanel({
  offset,
  mode,
  onClose,
  textClass,
  style,
  isLight,
  mutedClass,
  transaction,
  stack,
  selfId,
  currentId,
  onNavigate,
}: {
  offset: { x: number; y: number };
  mode: "pinned" | "preview";
  onClose: () => void;
  textClass: string;
  style: React.CSSProperties;
  isLight: boolean;
  mutedClass: string;
  transaction: NonNullable<ReturnType<typeof mapZeroTransactionDetailRow>>["transaction"] | null;
  stack: PinDatum[] | null;
  selfId: string | undefined;
  currentId: string;
  onNavigate: (p: PinDatum) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: "txn-detail-panel" });
  const dx = offset.x + (transform?.x ?? 0);
  const dy = offset.y + (transform?.y ?? 0);

  const hasStack = !!(stack && stack.length > 0);
  const scrollClass = `[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ${
    isLight
      ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
      : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
  } [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full`;
  const fmtDate = (d: string | number | null) => {
    if (!d) {
      return "";
    }
    const dt = new Date(d);
    return Number.isNaN(dt.getTime())
      ? ""
      : dt.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  const isPreview = mode === "preview";
  return (
    <div
      ref={isPreview ? undefined : setNodeRef}
      className={`fixed bottom-4 right-[18rem] z-20 max-w-[calc(100vw-2rem)] ${hasStack ? "w-[38rem]" : "w-[26rem]"} ${isPreview ? "pointer-events-none" : ""}`}
      style={{ transform: `translate3d(${dx}px, ${dy}px, 0)` }}
    >
      <div className={`relative rounded-2xl border ${textClass}`} style={style}>
        {!isPreview && (
          <>
            <div
              {...listeners}
              {...attributes}
              className="absolute left-0 right-10 top-0 h-7 cursor-grab touch-none select-none rounded-t-2xl active:cursor-grabbing"
              aria-hidden
            />
            <button
              type="button"
              onClick={onClose}
              className={`absolute right-3 top-3 z-10 size-7 rounded-full text-sm transition ${isLight ? "hover:bg-black/10" : "hover:bg-white/10"}`}
            >
              ✕
            </button>
          </>
        )}
        <div className="flex h-[20rem]">
          {hasStack && stack && (
            <nav
              className={`w-40 shrink-0 overflow-y-auto border-r py-3 pl-3 pr-2 ${scrollClass} ${isLight ? "border-black/10" : "border-white/10"}`}
            >
              <ul className="flex flex-col gap-1">
                {stack.map((p) => {
                  const active = p.id === currentId;
                  let cls: string;
                  if (active) {
                    cls = isLight ? "bg-black/10" : "bg-white/15";
                  } else {
                    cls = isLight ? "hover:bg-black/5" : "hover:bg-white/10";
                  }
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate(p)}
                        className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition ${cls}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium">
                            {fmtDate(p.date) || p.merchant}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            ${Math.abs(p.amount).toFixed(2)}
                          </span>
                        </div>
                        {p.userId !== selfId && (
                          <div className={`truncate ${mutedClass}`}>{p.person}</div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          <div className={`flex-1 overflow-y-auto px-4 py-3 ${scrollClass}`} style={{ zoom: 0.85 }}>
            {transaction ? (
              <div className="flex flex-col gap-6">
                <TransactionDetailSummary transaction={transaction} hideLocationMap />
                {transaction.notes && (
                  <div className="flex flex-col gap-2">
                    <h2 className="font-medium text-foreground text-base">Notes</h2>
                    <div className="whitespace-pre-wrap text-foreground text-base leading-relaxed">
                      {transaction.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`py-6 text-center text-sm ${mutedClass}`}>Loading transaction…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
