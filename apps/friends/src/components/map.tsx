import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import { IconLayer } from "@deck.gl/layers";
import { CATEGORY_SYSTEM_ICON_SRC } from "@cobalt-web/ui/cobalt/transactions/categories/index";
import { Map as MapGL } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { getAvatarIcon } from "./avatar-icon";
import { getMerchantIcon } from "./merchant-icon";
import { buildSvgAtlas } from "./svg-atlas";
import { INITIAL_VIEW_STATE, LIGHT_STYLES, MAP_STYLES, SERVER_URL } from "./map/constants";
import { InspectorPanel } from "./map/inspector";
import { MerchantPanel } from "./map/merchant-panel";
import { DeckGLOverlay, NycSubwayLines } from "./map/nyc-subway";
import { PeopleLeaderboard } from "./map/people-leaderboard";
import { PlacesPanel } from "./map/places-panel";
import { TxnDetailPanel } from "./map/txn-panel";
import type { Category, HoverState, PinDatum, StyleKey, TimeWindow, ViewMode } from "./map/types";
import { colorForUser, useFriendsMapData } from "./map/use-friends-map-data";
import { aggregatePeople, computeGlassStyle, stackKeyForPin, withinWindow } from "./map/utils";

const avatarProxyUrl = (uid: string) =>
  SERVER_URL ? `${SERVER_URL.replace(/\/$/, "")}/api/avatar/${uid}` : null;

type IconBuilder = (d: PinDatum) => {
  anchorX: number;
  anchorY: number;
  height: number;
  id: string;
  url: string;
  width: number;
};

interface BuildPinLayerArgs {
  viewMode: ViewMode;
  allPins: PinDatum[];
  landmarkAtlas: Awaited<ReturnType<typeof buildSvgAtlas>>;
  merchantTeardropIconFor: IconBuilder;
  merchantIconVersion: number;
  avatarFor: IconBuilder;
  avatarVersion: number;
  pinClickHandler: (object: unknown) => void;
  pinHoverHandler: (info: { object?: unknown; x: number; y: number }) => void;
}

function buildPinLayer({
  viewMode,
  allPins,
  landmarkAtlas,
  merchantTeardropIconFor,
  merchantIconVersion,
  avatarFor,
  avatarVersion,
  pinClickHandler,
  pinHoverHandler,
}: BuildPinLayerArgs): unknown[] {
  const common = {
    alphaCutoff: 0.05,
    billboard: true,
    data: allPins,
    getColor: [255, 255, 255, 255] as [number, number, number, number],
    getPosition: (d: PinDatum) => [d.position[0], d.position[1], 0] as [number, number, number],
    onClick: ({ object }: { object?: unknown }) => pinClickHandler(object),
    onHover: pinHoverHandler,
    pickable: true,
    sizeUnits: "meters" as const,
  };
  if (viewMode === "places") {
    return [
      new IconLayer<PinDatum>({
        ...common,
        getIcon: merchantTeardropIconFor,
        getSize: 48,
        id: "merchant-landmarks",
        sizeMaxPixels: 560,
        sizeMinPixels: 60,
        updateTriggers: { getIcon: merchantIconVersion },
      }),
    ];
  }
  if (viewMode === "pins" && landmarkAtlas) {
    return [
      new IconLayer<PinDatum>({
        ...common,
        getIcon: (d) => (d.category in landmarkAtlas.mapping ? d.category : "uncategorized"),
        getSize: 30,
        iconAtlas: landmarkAtlas.url,
        iconMapping: landmarkAtlas.mapping,
        id: "category-landmarks",
        sizeMaxPixels: 400,
        sizeMinPixels: 40,
      }),
    ];
  }
  if (viewMode === "people") {
    // Each pin = circular avatar tile pre-baked via canvas; lettermark fallback.
    return [
      new IconLayer<PinDatum>({
        ...common,
        getIcon: avatarFor,
        getSize: 48,
        id: "people-avatars",
        sizeMaxPixels: 560,
        sizeMinPixels: 60,
        updateTriggers: { getIcon: avatarVersion },
      }),
    ];
  }
  return [];
}

interface RenderTxnDetailArgs {
  hover: HoverState | null;
  selectedTxnId: string | null;
  stackKey: string | null;
  allPins: PinDatum[];
  userId: string | undefined;
  userName: string;
  authedUserId: string | undefined;
  friendNameById: Map<string, { name: string; image: string | null }>;
  glassStyle: ReturnType<typeof computeGlassStyle>;
  flyTo: (lon: number, lat: number, zoom?: number) => void;
  setSelectedTxnId: (id: string | null) => void;
  setStackKey: (k: string | null) => void;
}

function renderTxnDetail({
  hover,
  selectedTxnId,
  stackKey,
  allPins,
  userId,
  userName,
  authedUserId,
  friendNameById,
  glassStyle,
  flyTo,
  setSelectedTxnId,
  setStackKey,
}: RenderTxnDetailArgs) {
  const hoverPin = hover?.pin ?? null;
  const displayTxnId = hoverPin?.id ?? selectedTxnId ?? null;
  if (!displayTxnId) {
    return null;
  }
  const mode: "pinned" | "preview" = hoverPin ? "preview" : "pinned";
  const key = hoverPin ? stackKeyForPin(hoverPin) : stackKey;
  const ownerId = (hoverPin ?? allPins.find((p) => p.id === displayTxnId))?.userId;
  // Rail scoped to pins owned by the same user as the displayed pin.
  const coordStack =
    key && ownerId ? allPins.filter((p) => stackKeyForPin(p) === key && p.userId === ownerId) : [];
  const displayPin = hoverPin ?? allPins.find((p) => p.id === displayTxnId) ?? null;
  const isSelfPin = displayPin?.userId === userId;
  const personName = personNameFor(displayPin, isSelfPin, userName);
  const personAvatarUrl = personAvatarFor(displayPin, isSelfPin, friendNameById);
  return (
    <TxnDetailPanel
      txnId={displayTxnId}
      mode={mode}
      onClose={() => {
        setSelectedTxnId(null);
        setStackKey(null);
      }}
      glassStyle={glassStyle}
      stack={coordStack.length > 1 ? coordStack : null}
      selfId={userId}
      onNavigate={(p) => {
        flyTo(p.position[0], p.position[1]);
        setSelectedTxnId(p.id);
      }}
      person={personName}
      personAvatarUrl={personAvatarUrl}
      editable={!!authedUserId && isSelfPin}
    />
  );
}

function personNameFor(pin: PinDatum | null, isSelf: boolean, selfName: string): string | null {
  if (!pin) {
    return null;
  }
  return isSelf ? selfName : (pin.person ?? null);
}

function personAvatarFor(
  pin: PinDatum | null,
  isSelf: boolean,
  friendNameById: Map<string, { name: string; image: string | null }>,
): string | null {
  if (!pin || isSelf) {
    return null;
  }
  return friendNameById.get(pin.userId)?.image ?? null;
}

function toggleSetItem<T>(prev: Set<T>, item: T): Set<T> {
  const next = new Set(prev);
  if (next.has(item)) {
    next.delete(item);
  } else {
    next.add(item);
  }
  return next;
}

// Multi-select category filter. First toggle snapshots the currently-visible
// set, then removes/adds the clicked category. Returns null when the set
// matches present (== "no filter").
function toggleCategoryFilter(
  prev: Set<Category> | null,
  present: Set<Category>,
  c: Category,
): Set<Category> | null {
  const base = prev ?? new Set(present);
  const next = toggleSetItem(base, c);
  if (next.size === present.size && [...present].every((p) => next.has(p))) {
    return null;
  }
  return next;
}

// Apply hidden-friend + active-category + time-window filters in one pass.
function filterVisiblePins({
  activeCategories,
  friendPinsRaw,
  hiddenFriendIds,
  selfPinsRaw,
  timeWindow,
  userId,
}: {
  activeCategories: Set<Category> | null;
  friendPinsRaw: PinDatum[];
  hiddenFriendIds: Set<string>;
  selfPinsRaw: PinDatum[];
  timeWindow: TimeWindow;
  userId: string;
}): PinDatum[] {
  const passes = (p: PinDatum) =>
    (activeCategories === null || activeCategories.has(p.category)) &&
    withinWindow(p.date, timeWindow) &&
    !hiddenFriendIds.has(p.userId);
  const selfHidden = hiddenFriendIds.has(userId);
  const pins = selfHidden ? [] : selfPinsRaw.filter(passes);
  return [...pins, ...friendPinsRaw.filter(passes)];
}

// City quick-jump targets used by the Inspector "Cities" button row.
function flyToCityHelper(
  flyTo: (lon: number, lat: number, zoom?: number) => void,
  city: "nyc" | "sf",
): void {
  if (city === "nyc") {
    flyTo(-73.9776, 40.7259, 12);
    return;
  }
  flyTo(-122.4194, 37.7749, 12.5);
}

// Top-level orchestrator. Data assembly via `useFriendsMapData`, layer
// construction via `buildPinLayer`, detail panel via `renderTxnDetail`,
// toggle/filter helpers above.
export function FriendsMap() {
  const [styleKey, setStyleKey] = useState<StyleKey>("carto-dark");
  const [showSubway, setShowSubway] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [stackKey, setStackKey] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const flyTo = (lon: number, lat: number, zoom = 16) => {
    mapRef.current?.flyTo({
      center: [lon, lat],
      duration: 1200,
      essential: true,
      zoom,
    });
  };
  const [viewMode, setViewMode] = useState<ViewMode>("pins");
  // Bumped whenever an async avatar canvas finishes loading so IconLayer's
  // `updateTriggers` knows to re-read getIcon and pick up the new data URL.
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [merchantIconVersion, setMerchantIconVersion] = useState(0);
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

  const {
    authedUserId,
    friendList,
    friendNameById,
    friendPinsRaw,
    presentCategories,
    selfImage,
    selfPinsRaw,
    unmappedInStore,
    userId,
    userName,
  } = useFriendsMapData(timeWindow);

  // Two atlases — flat disc tiles for the "dots" style, teardrop tiles
  // (matching the people-avatar shape) for the "landmark" style.
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

  const allPins = filterVisiblePins({
    activeCategories,
    friendPinsRaw,
    hiddenFriendIds,
    selfPinsRaw,
    timeWindow,
    userId,
  });

  const flyToCity = (city: "nyc" | "sf") => flyToCityHelper(flyTo, city);

  const people = aggregatePeople(allPins);

  const layers: unknown[] = [];

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
      return;
    }
    // Friend pin: prefer a self pin at the same coord (so the panel still
    // shows the viewer's own row when stacked); otherwise open the friend's.
    const selfAt = atCoord.find((x) => x.userId === userId);
    setSelectedTxnId(selfAt?.id ?? p.id);
  };
  const pinHoverHandler = (info: { object?: unknown; x: number; y: number }) => {
    setHover(info.object ? { pin: info.object as PinDatum, x: info.x, y: info.y } : null);
  };

  const merchantTeardropIconFor = (d: PinDatum) => {
    const dataUrl = getMerchantIcon(
      {
        key: `${d.merchant}|${d.website ?? ""}|${d.logoUrl ?? ""}`,
        logoUrl: d.logoUrl,
        merchant: d.merchant,
        shape: "teardrop",
        website: d.website,
      },
      () => setMerchantIconVersion((v) => v + 1),
    );
    return {
      anchorX: 64,
      anchorY: 160,
      height: 160,
      id: `${d.merchant}-td-${merchantIconVersion}`,
      url: dataUrl,
      width: 128,
    } as const;
  };

  const avatarFor = (d: PinDatum) => {
    const isSelf = d.userId === userId;
    const initial = (isSelf ? userName : d.person).charAt(0) || "?";
    const url = avatarProxyUrl(d.userId);
    const dataUrl = getAvatarIcon(
      {
        fallbackInitial: initial,
        key: d.userId,
        ring: colorForUser(d.userId, userId),
        url,
      },
      () => setAvatarVersion((v) => v + 1),
    );
    return {
      anchorX: 64,
      anchorY: 160,
      height: 160,
      id: `${d.userId}-${avatarVersion}`,
      url: dataUrl,
      width: 128,
    } as const;
  };
  const landmarkAtlas = svgAtlasTeardrop ?? svgAtlas;
  layers.push(
    ...buildPinLayer({
      allPins,
      avatarFor,
      avatarVersion,
      landmarkAtlas,
      merchantIconVersion,
      merchantTeardropIconFor,
      pinClickHandler,
      pinHoverHandler,
      viewMode,
    }),
  );

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
      {viewMode === "people" && (
        <PeopleLeaderboard
          people={people}
          pins={allPins}
          categories={activeCategories}
          glassStyle={glassStyle}
          selfId={userId}
          viewMode={viewMode}
          onViewMode={setViewMode}
        />
      )}
      {viewMode === "places" && (
        <PlacesPanel
          pins={allPins}
          glassStyle={glassStyle}
          viewMode={viewMode}
          onViewMode={setViewMode}
          flyTo={flyTo}
        />
      )}
      {viewMode === "pins" && (
        <MerchantPanel
          unmappedTxns={unmappedInStore}
          inStorePins={allPins}
          flyTo={flyTo}
          selfId={userId}
          selfName={userName}
          selfImageUrl={selfImage}
          onSelectTxn={openSelfTxn}
          glassStyle={glassStyle}
          viewMode={viewMode}
          onViewMode={setViewMode}
        />
      )}
      {renderTxnDetail({
        allPins,
        authedUserId,
        flyTo,
        friendNameById,
        glassStyle,
        hover,
        selectedTxnId,
        setSelectedTxnId,
        setStackKey,
        stackKey,
        userId,
        userName,
      })}
      <InspectorPanel
        timeWindow={timeWindow}
        onTimeWindow={setTimeWindow}
        onFlyToCity={flyToCity}
        friends={friendList}
        hiddenFriendIds={hiddenFriendIds}
        onToggleFriend={(id) => setHiddenFriendIds((prev) => toggleSetItem(prev, id))}
        activeCategories={activeCategories}
        presentCategories={presentCategories}
        onToggleCategory={(c) =>
          setActiveCategories((prev) => toggleCategoryFilter(prev, presentCategories, c))
        }
        styleKey={styleKey}
        onStyleKey={setStyleKey}
        showSubway={showSubway}
        onSubwayChange={setShowSubway}
        glassStyle={glassStyle}
      />
    </div>
  );
}
