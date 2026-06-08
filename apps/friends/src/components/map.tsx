import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import { IconLayer } from "@deck.gl/layers";
import { queries } from "@cobalt-web/zero";
import {
  CATEGORY_SYSTEM_ICON_SRC,
  pfcDetailedToSystemKey,
} from "@cobalt-web/ui/cobalt/transactions/categories/index";
import { useQuery } from "@rocicorp/zero/react";
import { Map as MapGL } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { authClient } from "../lib/auth-client";
import { getAvatarIcon } from "./avatar-icon";
import { buildSvgAtlas } from "./svg-atlas";
import { INITIAL_VIEW_STATE, LIGHT_STYLES, MAP_STYLES, SERVER_URL } from "./map/constants";
import { InspectorPanel } from "./map/inspector";
import { MerchantPanel } from "./map/merchant-panel";
import { DeckGLOverlay, NycSubwayLines } from "./map/nyc-subway";
import { PeopleLeaderboard } from "./map/people-leaderboard";
import { TxnDetailPanel } from "./map/txn-panel";
import type {
  Category,
  HoverState,
  MarkerStyle,
  PinDatum,
  StyleKey,
  TimeWindow,
  ViewMode,
} from "./map/types";
import {
  aggregatePeople,
  computeGlassStyle,
  normalizePostDate,
  stackKeyForPin,
  withinWindow,
} from "./map/utils";

const avatarProxyUrl = (uid: string) =>
  SERVER_URL ? `${SERVER_URL.replace(/\/$/, "")}/api/avatar/${uid}` : null;

// eslint-disable-next-line complexity
export function FriendsMap() {
  const [styleKey, setStyleKey] = useState<StyleKey>("carto-dark");
  const [showSubway, setShowSubway] = useState(false);
  const [hover, setHover] = useState<HoverState | null>(null);
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [stackKey, setStackKey] = useState<string | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const flyTo = (lon: number, lat: number) => {
    mapRef.current?.flyTo({
      center: [lon, lat],
      duration: 1200,
      essential: true,
      zoom: 16,
    });
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

  // Resolve friend display names. friendIds derived below — recompute the
  // id list here too so the Zero query memoizes on a stable shape.
  const friendIdList = friendships
    .map((f) => (f.userAId === userId ? f.userBId : f.userAId))
    .filter(Boolean) as string[];
  const [friendProfiles] = useQuery(
    queries.social.friendProfiles({
      ids: friendIdList.length > 0 ? friendIdList : ["__none__"],
    }),
  );
  const friendNameById = new Map<string, { name: string; image: string | null }>();
  for (const p of friendProfiles) {
    friendNameById.set(p.id, {
      image: p.image ?? null,
      name: p.displayUsername ?? p.name ?? p.email?.split("@")[0] ?? `user ${p.id.slice(0, 6)}`,
    });
  }

  const friendIds = new Set(friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId)));
  // Stable list for the Friends toggle UI — self first (gold), then every
  // accepted friendship (orange), even ones with zero shared posts so users
  // can pre-mute a new friend.
  const friendList = [
    { id: userId ?? "self", isSelf: true as const, label: userName },
    ...[...friendIds].map((id) => ({
      id,
      isSelf: false as const,
      label: friendNameById.get(id)?.name ?? `user ${id.slice(0, 6)}`,
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
      amountHidden: false,
      cardName: null,
      category: pfcDetailedToSystemKey(t.pfcDetailed ?? null),
      city: t.city ?? null,
      date: t.date,
      id: t.id,
      institutionName: null,
      logoUrl: t.logoUrl ?? null,
      merchant,
      merchantHidden: false,
      notes: t.notes ?? null,
      paymentChannel: t.paymentChannel ?? null,
      person: userName,
      position: [t.lon, t.lat] as [number, number],
      region: t.region ?? null,
      userId: userId ?? "self",
      website: t.website ?? null,
    };
  });

  const friendPinsRaw: PinDatum[] = friendPosts.map((p) => ({
    address: null,
    amount: p.amountCents === null ? 0 : Number(p.amountCents) / 100,
    amountHidden: p.amountCents === null,
    cardName: p.cardName ?? null,
    category: "uncategorized",
    city: null,
    date: normalizePostDate(p.date),
    id: p.id,
    institutionName: p.institutionName ?? null,
    logoUrl: null,
    merchant: p.merchantName ?? "Hidden",
    merchantHidden: p.merchantName === null,
    notes: p.note ?? null,
    paymentChannel: null,
    person: friendNameById.get(p.userId)?.name ?? `user ${p.userId.slice(0, 6)}`,
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
