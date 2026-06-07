import { MapboxOverlay } from "@deck.gl/mapbox";
import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { Tiles3DLoader } from "@loaders.gl/3d-tiles";
import { queries } from "@cobalt-web/zero";
import { MerchantLogo } from "@cobalt-web/ui/cobalt/logos/merchant-logo";
import { TransactionDetailSummary } from "@cobalt-web/ui/cobalt/transactions/detail/transaction-detail-summary";
import { mapZeroTransactionDetailRow } from "@cobalt-web/ui/cobalt/transactions/lib/dto";
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { useQuery } from "@rocicorp/zero/react";
import { Map as MapGL, Source, Layer, useControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useRef, useState } from "react";
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

type Category = "food" | "coffee" | "shopping" | "travel" | "entertainment" | "groceries" | "other";

type ViewMode = "pins" | "heat" | "people";

type TimeWindow = 7 | 30 | 90 | 0;

interface PinDatum {
  id: string;
  position: [number, number];
  merchant: string;
  amount: number;
  person: string;
  userId: string;
  category: Category;
  date: string | number | null;
  logoUrl: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  notes: string | null;
}

const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string; color: [number, number, number] }
> = {
  coffee: { color: [180, 120, 60], emoji: "☕", label: "Coffee" },
  entertainment: { color: [236, 72, 153], emoji: "🎬", label: "Fun" },
  food: { color: [239, 68, 68], emoji: "🍔", label: "Food" },
  groceries: { color: [34, 197, 94], emoji: "🛒", label: "Groceries" },
  other: { color: [148, 163, 184], emoji: "•", label: "Other" },
  shopping: { color: [168, 85, 247], emoji: "🛍️", label: "Shopping" },
  travel: { color: [59, 130, 246], emoji: "✈️", label: "Travel" },
};

const CATEGORY_KEYWORDS: [Category, RegExp][] = [
  ["coffee", /\b(coffee|starbucks|dunkin|peet|blue bottle|cafe|espresso|caribou)\b/i],
  [
    "groceries",
    /\b(whole foods|trader joe|safeway|kroger|aldi|costco|wegmans|grocery|market|publix)\b/i,
  ],
  [
    "food",
    /\b(restaurant|pizza|burger|sushi|taco|chipotle|mcdonald|wendy|kfc|subway|doordash|uber eats|grubhub|panera|chick.?fil|sweetgreen|domino|deli|kitchen|grill|bbq|ramen|thai|chinese|mexican)\b/i,
  ],
  [
    "travel",
    /\b(uber|lyft|airline|airways|hotel|airbnb|delta|united|jetblue|marriott|hilton|amtrak|airport|flight|gas|shell|chevron|exxon|bp\b)\b/i,
  ],
  [
    "entertainment",
    /\b(spotify|netflix|hulu|disney|cinema|theater|theatre|amc|regal|concert|ticketmaster|stubhub|bar|brewery|brewing|pub|club)\b/i,
  ],
  [
    "shopping",
    /\b(amazon|target|walmart|best buy|nike|adidas|apple store|sephora|ulta|store|shop|mall|nordstrom|macy|h&m|zara|uniqlo|etsy)\b/i,
  ],
];

function inferCategory(merchant: string): Category {
  for (const [cat, re] of CATEGORY_KEYWORDS) {
    if (re.test(merchant)) {
      return cat;
    }
  }
  return "other";
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

function bucketKey(lat: number, lon: number): string {
  // ~11m bucket — collapse colocated points
  return `${lat.toFixed(4)}|${lon.toFixed(4)}`;
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

interface PersonAgg {
  userId: string;
  name: string;
  total: number;
  count: number;
  lat: number;
  lon: number;
  byCat: Record<Category, number>;
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
      existing.byCat[p.category] += amt;
    } else {
      const byCat = Object.fromEntries(
        (Object.keys(CATEGORY_META) as Category[]).map((c) => [c, 0]),
      ) as Record<Category, number>;
      byCat[p.category] = amt;
      personAgg.set(p.userId, {
        byCat,
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
  const [show3D, setShow3D] = useState(false);
  const [showSubway, setShowSubway] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const flyTo = (lon: number, lat: number) => {
    mapRef.current?.flyTo({ center: [lon, lat], duration: 1200, essential: true, zoom: 16 });
  };
  const [viewMode, setViewMode] = useState<ViewMode>("pins");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(30);
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    () => new Set(Object.keys(CATEGORY_META) as Category[]),
  );

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
      category: inferCategory(merchant),
      city: t.city ?? null,
      date: t.date,
      id: t.id,
      logoUrl: t.logoUrl ?? null,
      merchant,
      notes: t.notes ?? null,
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
      category: inferCategory(p.merchantName),
      city: null,
      date: typeof p.date === "number" ? p.date : null,
      id: p.id,
      logoUrl: null,
      merchant: p.merchantName,
      notes: p.note ?? null,
      person: `user ${p.userId.slice(0, 6)}`,
      position: [p.lon, p.lat] as [number, number],
      region: null,
      userId: p.userId,
      website: null,
    }));

  const passesFilter = (p: PinDatum) =>
    activeCategories.has(p.category) && withinWindow(p.date, timeWindow);

  const pins = selfPinsRaw.filter(passesFilter);
  const friendPins = friendPinsRaw.filter(passesFilter);
  const allPins = [...pins, ...friendPins];

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

  // Co-location buckets for People view (stack people at same place).
  const peopleByBucket = new Map<string, typeof people>();
  for (const person of people) {
    const k = bucketKey(person.lat, person.lon);
    const arr = peopleByBucket.get(k);
    if (arr) {
      arr.push(person);
    } else {
      peopleByBucket.set(k, [person]);
    }
  }
  const peopleMarkers = [...peopleByBucket.entries()].map(([k, members]) => {
    const lat = members.reduce((s, m) => s + m.lat, 0) / members.length;
    const lon = members.reduce((s, m) => s + m.lon, 0) / members.length;
    const total = members.reduce((s, m) => s + m.total, 0);
    return { count: members.length, key: k, lat, lon, members, total };
  });

  const layers: unknown[] = [];
  if (show3D && GOOGLE_3D_TILES_KEY) {
    layers.push(
      new Tile3DLayer({
        data: `https://tile.googleapis.com/v1/3dtiles/root.json?key=${GOOGLE_3D_TILES_KEY}`,
        id: "google-3d-tiles",
        loader: Tiles3DLoader,
      }),
    );
  }

  if (viewMode === "heat") {
    layers.push(
      new HeatmapLayer<PinDatum>({
        aggregation: "SUM",
        data: allPins,
        debounceTimeout: 500,
        getPosition: (d) => [d.position[0], d.position[1]],
        getWeight: (d) => Math.max(1, Math.abs(d.amount)),
        id: "spend-heat",
        intensity: 1,
        radiusPixels: 40,
        threshold: 0.05,
        weightsTextureSize: 512,
      }),
    );
  } else if (viewMode === "pins") {
    layers.push(
      new ScatterplotLayer<PinDatum>({
        data: pins,
        getFillColor: (d) =>
          [...CATEGORY_META[d.category].color, 255] as [number, number, number, number],
        getLineColor: [255, 255, 255, 220],
        getPosition: (d) => [d.position[0], d.position[1], 0],
        getRadius: 20,
        id: "self-pins",
        lineWidthMinPixels: 2,
        onClick: ({ object }) => {
          if (object) {
            const p = object as PinDatum;
            flyTo(p.position[0], p.position[1]);
            setSelectedTxnId(p.id);
          }
        },
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
        getFillColor: (d) =>
          [...CATEGORY_META[d.category].color, 255] as [number, number, number, number],
        getLineColor: [16, 185, 129, 255],
        getPosition: (d) => [d.position[0], d.position[1], 0],
        getRadius: 22,
        id: "friend-pins",
        lineWidthMinPixels: 3,
        onClick: ({ object }) => {
          if (object) {
            const p = object as PinDatum;
            flyTo(p.position[0], p.position[1]);
          }
        },
        onHover: ({ object, x, y }) => {
          setHover(object ? { pin: object as PinDatum, x, y } : null);
        },
        pickable: true,
        radiusMaxPixels: 44,
        radiusMinPixels: 12,
        radiusUnits: "pixels",
        stroked: true,
      }),
    );
  } else {
    // people
    const maxTotal = Math.max(1, ...peopleMarkers.map((m) => m.total));
    layers.push(
      new ScatterplotLayer<(typeof peopleMarkers)[number]>({
        data: peopleMarkers,
        getFillColor: (d) =>
          d.members[0]?.userId === userId ? [255, 215, 0, 230] : [16, 185, 129, 230],
        getLineColor: [255, 255, 255, 255],
        getPosition: (d) => [d.lon, d.lat, 0],
        getRadius: (d) => 18 + 30 * Math.sqrt(d.total / maxTotal),
        id: "people-bubbles",
        lineWidthMinPixels: 2,
        onClick: ({ object }) => {
          if (object) {
            const d = object as (typeof peopleMarkers)[number];
            flyTo(d.lon, d.lat);
          }
        },
        pickable: true,
        radiusMaxPixels: 80,
        radiusMinPixels: 18,
        radiusUnits: "pixels",
        stroked: true,
      }),
      new TextLayer<(typeof peopleMarkers)[number]>({
        background: false,
        characterSet: "auto",
        data: peopleMarkers,
        fontWeight: 700,
        getColor: [255, 255, 255, 255],
        getPosition: (d) => [d.lon, d.lat, 0],
        getSize: 14,
        getText: (d) =>
          d.count > 1 ? `${d.count}× ${d.members[0]?.name ?? ""}` : (d.members[0]?.name ?? ""),
        id: "people-labels",
        sizeUnits: "pixels",
      }),
    );
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
          onSelectTxn={setSelectedTxnId}
          glassStyle={glassStyle}
        />
      )}
      {viewMode === "pins" && hover && <PinTooltip hover={hover} glassStyle={glassStyle} />}
      {selectedTxnId && (
        <TxnDetailPanel
          txnId={selectedTxnId}
          onClose={() => setSelectedTxnId(null)}
          glassStyle={glassStyle}
        />
      )}
      <InspectorPanel
        viewMode={viewMode}
        onViewMode={setViewMode}
        timeWindow={timeWindow}
        onTimeWindow={setTimeWindow}
        activeCategories={activeCategories}
        onToggleCategory={(c) => {
          setActiveCategories((prev) => {
            const next = new Set(prev);
            if (next.has(c)) {
              next.delete(c);
            } else {
              next.add(c);
            }
            if (next.size === 0) {
              return prev;
            }
            return next;
          });
        }}
        styleKey={styleKey}
        onStyleKey={setStyleKey}
        show3D={show3D}
        on3DChange={setShow3D}
        has3DKey={Boolean(GOOGLE_3D_TILES_KEY)}
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
            className={`flex-1 rounded px-2 py-1.5 text-[11px] font-semibold transition ${tab === "top" ? activeTab : idleTab}`}
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => setTab("instore")}
            className={`flex-1 rounded px-2 py-1.5 text-[11px] font-semibold transition ${tab === "instore" ? activeTab : idleTab}`}
          >
            In-store {sortedInStore.length > 0 && `(${sortedInStore.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab("unmapped")}
            className={`flex-1 rounded px-2 py-1.5 text-[11px] font-semibold transition ${tab === "unmapped" ? activeTab : idleTab}`}
          >
            Unmapped {unmappedTxns.length > 0 && `(${unmappedTxns.length})`}
          </button>
        </div>
        {tab === "instore" && (
          <>
            <div className={`border-b px-3 py-2 ${dividerClass}`}>
              <input
                type="text"
                value={inStoreQuery}
                onChange={(e) => setInStoreQuery(e.target.value)}
                placeholder="Search merchant, city…"
                className={`w-full rounded-lg px-3 py-1.5 text-xs outline-none ${
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
                const meta = CATEGORY_META[p.category];
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
                      <div className="truncate text-xs font-medium leading-tight">{p.merchant}</div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${mutedClass}`}>
                        <span>{meta.emoji}</span>
                        <span>{dateStr}</span>
                        {loc && <span>·</span>}
                        {loc && <span className="truncate">{loc}</span>}
                      </div>
                    </div>
                    <div className="text-xs font-semibold tabular-nums">
                      {isOutflow ? "-" : "+"}${Math.abs(p.amount).toFixed(0)}
                    </div>
                  </button>
                );
              })}
              {sortedInStore.length === 0 && (
                <div className={`px-4 py-6 text-center text-xs ${mutedClass}`}>
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
                type="text"
                value={topQuery}
                onChange={(e) => setTopQuery(e.target.value)}
                placeholder="Search merchant…"
                className={`w-full rounded-lg px-3 py-1.5 text-xs outline-none ${
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
                    <div className="truncate text-xs font-medium leading-tight">{m.merchant}</div>
                    <div className={`text-[10px] ${mutedClass}`}>
                      {m.count} {m.count === 1 ? "txn" : "txns"}
                    </div>
                  </div>
                  <div className="text-xs font-semibold tabular-nums">${m.total.toFixed(0)}</div>
                </div>
              ))}
              {merchants.length === 0 && (
                <div className={`px-4 py-6 text-center text-xs ${mutedClass}`}>
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
                type="text"
                value={unmappedQuery}
                onChange={(e) => setUnmappedQuery(e.target.value)}
                placeholder="Search merchant, city…"
                className={`w-full rounded-lg px-3 py-1.5 text-xs outline-none ${
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
                      <div className="truncate text-xs font-medium leading-tight">{merchant}</div>
                      <div className={`flex items-center gap-1.5 text-[10px] ${mutedClass}`}>
                        <span>{dateStr}</span>
                        {loc && <span>·</span>}
                        {loc && <span className="truncate">{loc}</span>}
                      </div>
                    </div>
                    <div className="text-xs font-semibold tabular-nums">
                      {isOutflow ? "-" : "+"}${Math.abs(amt).toFixed(0)}
                    </div>
                  </button>
                );
              })}
              {sortedUnmapped.length === 0 && (
                <div className={`px-4 py-6 text-center text-xs ${mutedClass}`}>
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
      <div className={`min-w-[220px] rounded-2xl border p-3 ${textClass}`} style={style}>
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
      <div className={`mb-2 text-[10px] font-semibold uppercase tracking-wider ${mutedClass}`}>
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
          className={`flex-1 rounded px-2 py-1.5 text-xs font-semibold transition ${value === o.key ? activeBtn : idleBtn}`}
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
  timeWindow,
  onTimeWindow,
  activeCategories,
  onToggleCategory,
  styleKey,
  onStyleKey,
  show3D,
  on3DChange,
  has3DKey,
  showSubway,
  onSubwayChange,
  glassStyle,
}: {
  viewMode: ViewMode;
  onViewMode: (m: ViewMode) => void;
  timeWindow: TimeWindow;
  onTimeWindow: (w: TimeWindow) => void;
  activeCategories: Set<Category>;
  onToggleCategory: (c: Category) => void;
  styleKey: StyleKey;
  onStyleKey: (k: StyleKey) => void;
  show3D: boolean;
  on3DChange: (v: boolean) => void;
  has3DKey: boolean;
  showSubway: boolean;
  onSubwayChange: (v: boolean) => void;
  glassStyle: GlassStyle;
}) {
  const isLight = glassStyle.textClass === "text-black";
  const { style, textClass, dividerClass, mutedClass } = glassStyle;
  const activeBtn = isLight ? "bg-black text-white" : "bg-white text-black";
  const idleBtn = isLight ? "text-black hover:bg-black/10" : "text-white hover:bg-white/10";
  const allCats = Object.keys(CATEGORY_META) as Category[];

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
            { key: "pins", label: "Pins" },
            { key: "heat", label: "Heat" },
            { key: "people", label: "People" },
          ]}
          value={viewMode}
          onChange={onViewMode}
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
        <div className="flex flex-wrap gap-1">
          {allCats.map((c) => {
            const on = activeCategories.has(c);
            const meta = CATEGORY_META[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => onToggleCategory(c)}
                className={`rounded px-2 py-1 text-[11px] font-medium transition ${on ? activeBtn : idleBtn} ${on ? "" : "opacity-40"}`}
                title={meta.label}
              >
                <span className="mr-1">{meta.emoji}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
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
          className={`w-full rounded px-2 py-1.5 text-xs font-medium ${idleBtn} ${isLight ? "bg-black/5" : "bg-white/5"} outline-none`}
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
          {has3DKey && (
            <button
              type="button"
              onClick={() => on3DChange(!show3D)}
              className={`w-full rounded px-3 py-1.5 text-xs font-semibold transition ${show3D ? activeBtn : idleBtn}`}
            >
              3D Buildings {show3D ? "·  On" : "·  Off"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onSubwayChange(!showSubway)}
            className={`w-full rounded px-3 py-1.5 text-xs font-semibold transition ${showSubway ? activeBtn : idleBtn}`}
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
  categories: Set<Category>;
  glassStyle: GlassStyle;
  selfId: string | undefined;
}) {
  const { style, textClass, mutedClass, dividerClass } = glassStyle;
  const visibleCats = (Object.keys(CATEGORY_META) as Category[]).filter((c) => categories.has(c));
  const topOverall = people.toSorted((a, b) => b.total - a.total).slice(0, 10);

  const topByCat: { cat: Category; person: PersonAgg | null; amount: number }[] = visibleCats.map(
    (cat) => {
      let best: PersonAgg | null = null;
      let bestAmt = 0;
      for (const p of people) {
        const a = p.byCat[cat];
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
          <div className="text-sm font-semibold">Crew leaderboard</div>
          <div className={`text-[11px] ${mutedClass}`}>
            {people.length} people · ranked by total spend
          </div>
        </div>
        <div className={`border-b px-4 py-2 ${dividerClass}`}>
          {topOverall.map((p, i) => (
            <div key={p.userId} className="flex items-center gap-3 py-1.5">
              <div className={`w-5 text-center text-[11px] tabular-nums ${mutedClass}`}>
                #{i + 1}
              </div>
              <div className="min-w-0 flex-1 truncate text-xs font-medium">
                {p.name}
                {p.userId === selfId && (
                  <span className={`ml-1 text-[10px] ${mutedClass}`}>(you)</span>
                )}
              </div>
              <div className="text-xs font-semibold tabular-nums">${p.total.toFixed(0)}</div>
            </div>
          ))}
          {topOverall.length === 0 && (
            <div className={`py-3 text-center text-xs ${mutedClass}`}>No data in range</div>
          )}
        </div>
        <div className="px-4 py-2">
          <div className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${mutedClass}`}>
            Category champions
          </div>
          {topByCat.map(({ cat, person, amount }) => {
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} className="flex items-center gap-2 py-1">
                <span className="w-5 text-center">{meta.emoji}</span>
                <span className="w-20 text-xs">{meta.label}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {person ? person.name : <span className={mutedClass}>—</span>}
                </span>
                <span className="text-xs font-semibold tabular-nums">
                  {amount > 0 ? `$${amount.toFixed(0)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TxnDetailPanel({
  txnId,
  onClose,
  glassStyle,
}: {
  txnId: string;
  onClose: () => void;
  glassStyle: GlassStyle;
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
    <DndContext sensors={sensors} modifiers={[restrictToWindowEdges]} onDragEnd={handleDragEnd}>
      <DraggableTxnPanel
        offset={offset}
        onClose={onClose}
        textClass={textClass}
        style={style}
        isLight={isLight}
        mutedClass={mutedClass}
        transaction={transaction}
      />
    </DndContext>
  );
}

function DraggableTxnPanel({
  offset,
  onClose,
  textClass,
  style,
  isLight,
  mutedClass,
  transaction,
}: {
  offset: { x: number; y: number };
  onClose: () => void;
  textClass: string;
  style: React.CSSProperties;
  isLight: boolean;
  mutedClass: string;
  transaction: NonNullable<ReturnType<typeof mapZeroTransactionDetailRow>>["transaction"] | null;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: "txn-detail-panel" });
  const dx = offset.x + (transform?.x ?? 0);
  const dy = offset.y + (transform?.y ?? 0);

  return (
    <div
      ref={setNodeRef}
      className="fixed bottom-4 right-[18rem] z-20 w-[26rem] max-w-[calc(100vw-2rem)]"
      style={{ transform: `translate3d(${dx}px, ${dy}px, 0)` }}
    >
      <div className={`relative rounded-2xl border ${textClass}`} style={style}>
        <div
          {...listeners}
          {...attributes}
          className="absolute left-0 right-10 top-0 h-7 cursor-grab touch-none select-none rounded-t-2xl active:cursor-grabbing"
          aria-hidden
        />
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-3 top-3 z-10 size-7 rounded-full text-xs transition ${isLight ? "hover:bg-black/10" : "hover:bg-white/10"}`}
        >
          ✕
        </button>
        <div
          className={`max-h-[60vh] overflow-y-auto px-4 py-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent ${
            isLight
              ? "[scrollbar-color:rgba(0,0,0,0.15)_transparent] [&::-webkit-scrollbar-thumb]:bg-black/15"
              : "[scrollbar-color:rgba(255,255,255,0.2)_transparent] [&::-webkit-scrollbar-thumb]:bg-white/20"
          } [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full`}
        >
          {transaction ? (
            <div className="flex flex-col gap-6">
              <TransactionDetailSummary transaction={transaction} hideLocationMap />
              {transaction.notes && (
                <div className="flex flex-col gap-2">
                  <h2 className="font-medium text-foreground text-sm">Notes</h2>
                  <div className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
                    {transaction.notes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`py-6 text-center text-xs ${mutedClass}`}>Loading transaction…</div>
          )}
        </div>
      </div>
    </div>
  );
}
