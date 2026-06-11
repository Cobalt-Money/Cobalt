import type { MapboxOverlayProps } from "@deck.gl/mapbox";
import { IconLayer } from "@deck.gl/layers";
import { DEMO_USER_ID, queries } from "@cobalt-web/zero";
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

  const session = authClient.useSession();
  const authedUserId = session.data?.user.id;
  // Anon visitors see the seeded demo network as if logged in as the root demo user.
  const userId = authedUserId ?? DEMO_USER_ID;
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
  // Include the viewer's own id so the leaderboard self row gets an avatar
  // (esp. for anon, where session.data.user.image is unavailable).
  const profileIds = [...new Set([userId, ...friendIdList].filter(Boolean))] as string[];
  const [friendProfiles] = useQuery(
    queries.social.friendProfiles({
      ids: profileIds.length > 0 ? profileIds : ["__none__"],
    }),
  );
  const friendNameById = new Map<string, { name: string; image: string | null }>();
  for (const p of friendProfiles) {
    friendNameById.set(p.id, {
      image: p.image ?? null,
      name: p.displayUsername ?? p.name ?? p.email?.split("@")[0] ?? `user ${p.id.slice(0, 6)}`,
    });
  }

  // Self = gold. Each friend = a distinct hue, derived deterministically from
  // their user id so the color sticks across reloads + matches map + inspector.
  const FRIEND_PALETTE: [number, number, number][] = [
    [251, 146, 60], // orange
    [236, 72, 153], // pink
    [34, 197, 94], // green
    [59, 130, 246], // blue
    [168, 85, 247], // purple
    [20, 184, 166], // teal
    [239, 68, 68], // red
    [234, 179, 8], // amber
  ];
  const UINT32_MOD = 4_294_967_296;
  const hashUid = (uid: string): number => {
    // 32-bit DJB-style hash. Modulo 2^32 each step keeps precision within
    // Number.MAX_SAFE_INTEGER so long ids don't collapse to one bucket.
    let h = 0;
    for (let i = 0; i < uid.length; i += 1) {
      h = (h * 31 + (uid.codePointAt(i) ?? 0)) % UINT32_MOD;
    }
    return h;
  };
  const colorForUser = (uid: string): [number, number, number, number] => {
    if (uid === userId) {
      return [255, 215, 0, 230];
    }
    const c = FRIEND_PALETTE[hashUid(uid) % FRIEND_PALETTE.length] as [number, number, number];
    return [c[0], c[1], c[2], 230];
  };
  const cssColorForUser = (uid: string): string => {
    const [r, g, b] = colorForUser(uid);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const friendIds = new Set(friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId)));
  // Stable list for the Friends toggle UI — self first (gold), then every
  // accepted friendship (orange), even ones with zero shared posts so users
  // can pre-mute a new friend.
  const friendList = [
    {
      color: cssColorForUser(userId ?? "self"),
      id: userId ?? "self",
      isSelf: true as const,
      label: userName,
    },
    ...[...friendIds].map((id) => ({
      color: cssColorForUser(id),
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
      personImageUrl: session.data?.user.image ?? friendNameById.get(userId)?.image ?? null,
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
    category: (p.categorySystemKey ?? "uncategorized") as Category,
    city: null,
    date: normalizePostDate(p.date),
    // Use the underlying transaction id so the detail panel (which queries
    // `transactions.detail` by id) can resolve the row.
    id: p.transactionId,
    institutionName: p.institutionName ?? null,
    logoUrl: p.logoUrl ?? null,
    merchant: p.merchantName ?? "Hidden",
    merchantHidden: p.merchantName === null,
    notes: p.note ?? null,
    paymentChannel: null,
    person: friendNameById.get(p.userId)?.name ?? `user ${p.userId.slice(0, 6)}`,
    personImageUrl: friendNameById.get(p.userId)?.image ?? null,
    position: [p.lon, p.lat] as [number, number],
    region: null,
    userId: p.userId,
    website: p.website ?? null,
  }));

  const passesFilter = (p: PinDatum) =>
    (activeCategories === null || activeCategories.has(p.category)) &&
    withinWindow(p.date, timeWindow);

  const selfHidden = userId ? hiddenFriendIds.has(userId) : false;
  const pins = selfHidden ? [] : selfPinsRaw.filter(passesFilter);
  const friendPins = friendPinsRaw.filter(passesFilter);
  const allPins = [...pins, ...friendPins];

  // Quick-jump targets — the inspector "Cities" button row flies the camera
  // to one of these without touching the pin/data filter.
  const flyToCity = (city: "nyc" | "sf") => {
    // ~12 = city-wide view (all 5 boroughs / full peninsula).
    if (city === "nyc") {
      flyTo(-73.9776, 40.7259, 12);
    } else {
      flyTo(-122.4194, 37.7749, 12.5);
    }
  };

  // Categories with ≥1 in-store pin inside the current time window — drives
  // the filter UI so options track 7d/30d/90d/all.
  const presentCategories = new Set<Category>();
  for (const p of [...selfPinsRaw, ...friendPinsRaw]) {
    if (p.paymentChannel === "in store" && withinWindow(p.date, timeWindow)) {
      presentCategories.add(p.category);
    }
  }

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

  {
    const landmarkAtlas = svgAtlasTeardrop ?? svgAtlas;
    if (viewMode === "places") {
      layers.push(
        new IconLayer<PinDatum>({
          alphaCutoff: 0.05,
          billboard: true,
          data: allPins,
          getColor: [255, 255, 255, 255],
          getIcon: merchantTeardropIconFor,
          getPosition: (d) => [d.position[0], d.position[1], 0],
          getSize: 48,
          id: "merchant-landmarks",
          onClick: ({ object }) => pinClickHandler(object),
          onHover: pinHoverHandler,
          pickable: true,
          sizeMaxPixels: 560,
          sizeMinPixels: 60,
          sizeUnits: "meters",
          updateTriggers: { getIcon: merchantIconVersion },
        }),
      );
    } else if (viewMode === "pins" && landmarkAtlas) {
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
          getSize: 48,
          id: "people-avatars",
          onClick: ({ object }) => pinClickHandler(object),
          onHover: pinHoverHandler,
          pickable: true,
          sizeMaxPixels: 560,
          sizeMinPixels: 60,
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
          selfImageUrl={session.data?.user.image ?? friendNameById.get(userId)?.image ?? null}
          onSelectTxn={openSelfTxn}
          glassStyle={glassStyle}
          viewMode={viewMode}
          onViewMode={setViewMode}
        />
      )}
      {/* eslint-disable-next-line complexity */}
      {(() => {
        const hoverPin = hover?.pin ?? null;
        const displayTxnId = hoverPin?.id ?? selectedTxnId ?? null;
        if (!displayTxnId) {
          return null;
        }
        const mode: "pinned" | "preview" = hoverPin ? "preview" : "pinned";
        const key = hoverPin ? stackKeyForPin(hoverPin) : stackKey;
        // Rail scoped to pins owned by the same user as the displayed pin.
        // Only renders when that user actually has >1 txn at this coord.
        const ownerId = (hoverPin ?? allPins.find((p) => p.id === displayTxnId))?.userId;
        const coordStack =
          key && ownerId
            ? allPins.filter((p) => stackKeyForPin(p) === key && p.userId === ownerId)
            : [];
        const displayPin = hoverPin ?? allPins.find((p) => p.id === displayTxnId) ?? null;
        const isSelfPin = displayPin?.userId === userId;
        let personName: string | null = null;
        let personAvatarUrl: string | null = null;
        if (displayPin) {
          if (isSelfPin) {
            personName = userName;
          } else {
            personName = displayPin.person ?? null;
            personAvatarUrl = friendNameById.get(displayPin.userId)?.image ?? null;
          }
        }
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
      })()}
      <InspectorPanel
        timeWindow={timeWindow}
        onTimeWindow={setTimeWindow}
        onFlyToCity={flyToCity}
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
