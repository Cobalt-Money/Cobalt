import { DEMO_USER_ID, queries } from "@cobalt-web/zero";
import { pfcDetailedToSystemKey } from "@cobalt-web/ui/cobalt/transactions/categories/index";
import { useQuery } from "@rocicorp/zero/react";

import { authClient } from "../../lib/auth-client";
import type { Category, PinDatum, TimeWindow } from "./types";
import { normalizePostDate, withinWindow } from "./utils";

interface FriendProfile {
  name: string;
  image: string | null;
}

export interface FriendListItem {
  id: string;
  isSelf: boolean;
  label: string;
  color: string;
}

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

function hashUid(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i += 1) {
    h = (h * 31 + (uid.codePointAt(i) ?? 0)) % UINT32_MOD;
  }
  return h;
}

export function colorForUser(
  uid: string,
  selfId: string | undefined,
): [number, number, number, number] {
  if (uid === selfId) {
    return [255, 215, 0, 230];
  }
  const c = FRIEND_PALETTE[hashUid(uid) % FRIEND_PALETTE.length] as [number, number, number];
  return [c[0], c[1], c[2], 230];
}

function cssColorForUser(uid: string, selfId: string | undefined): string {
  const [r, g, b] = colorForUser(uid, selfId);
  return `rgb(${r}, ${g}, ${b})`;
}

function profileName(p: {
  displayUsername: string | null;
  name: string | null;
  email: string | null;
  id: string;
}): string {
  return p.displayUsername ?? p.name ?? p.email?.split("@")[0] ?? `user ${p.id.slice(0, 6)}`;
}

function buildFriendList(
  userId: string,
  userName: string,
  friendIds: Set<string>,
  friendNameById: Map<string, FriendProfile>,
): FriendListItem[] {
  return [
    {
      color: cssColorForUser(userId, userId),
      id: userId,
      isSelf: true as const,
      label: userName,
    },
    ...[...friendIds].map((id) => ({
      color: cssColorForUser(id, userId),
      id,
      isSelf: false as const,
      label: friendNameById.get(id)?.name ?? `user ${id.slice(0, 6)}`,
    })),
  ];
}

function isGeoTxn<
  T extends { excluded: boolean | null; source: string | null; lat: unknown; lon: unknown },
>(t: T): t is T & { lat: number; lon: number } {
  return (
    !t.excluded && t.source === "plaid" && typeof t.lat === "number" && typeof t.lon === "number"
  );
}

function isUnmappedInStore<
  T extends {
    excluded: boolean | null;
    source: string | null;
    paymentChannel: string | null;
    lat: unknown;
    lon: unknown;
  },
>(t: T): boolean {
  return (
    !t.excluded &&
    t.source === "plaid" &&
    t.paymentChannel === "in store" &&
    (typeof t.lat !== "number" || typeof t.lon !== "number")
  );
}

interface SelfPinSource {
  id: string;
  amount: string | number | null;
  merchantName: string | null;
  name: string | null;
  date: string | number | null;
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  address: string | null;
  notes: string | null;
  paymentChannel: string | null;
  pfcDetailed: string | null;
  logoUrl: string | null;
  website: string | null;
}

function mapSelfTxnToPin(
  t: SelfPinSource,
  userId: string,
  userName: string,
  selfImage: string | null,
): PinDatum {
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
    merchant: t.merchantName ?? t.name ?? "Unknown",
    merchantHidden: false,
    notes: t.notes ?? null,
    paymentChannel: t.paymentChannel ?? null,
    person: userName,
    personImageUrl: selfImage,
    position: [t.lon, t.lat],
    region: t.region ?? null,
    userId,
    website: t.website ?? null,
  };
}

interface FriendPostSource {
  amountCents: number | null;
  cardName: string | null;
  categorySystemKey: string | null;
  date: string | number | null;
  institutionName: string | null;
  lat: number;
  lon: number;
  logoUrl: string | null;
  merchantName: string | null;
  note: string | null;
  transactionId: string;
  userId: string;
  website: string | null;
}

function mapFriendPostToPin(
  p: FriendPostSource,
  friendNameById: Map<string, FriendProfile>,
): PinDatum {
  const profile = friendNameById.get(p.userId);
  return {
    address: null,
    amount: p.amountCents === null ? 0 : Number(p.amountCents) / 100,
    amountHidden: p.amountCents === null,
    cardName: p.cardName ?? null,
    category: (p.categorySystemKey ?? "uncategorized") as Category,
    city: null,
    date: normalizePostDate(p.date),
    id: p.transactionId,
    institutionName: p.institutionName ?? null,
    logoUrl: p.logoUrl ?? null,
    merchant: p.merchantName ?? "Hidden",
    merchantHidden: p.merchantName === null,
    notes: p.note ?? null,
    paymentChannel: null,
    person: profile?.name ?? `user ${p.userId.slice(0, 6)}`,
    personImageUrl: profile?.image ?? null,
    position: [p.lon, p.lat],
    region: null,
    userId: p.userId,
    website: p.website ?? null,
  };
}

function computePresentCategories(pins: PinDatum[], timeWindow: TimeWindow): Set<Category> {
  const present = new Set<Category>();
  for (const p of pins) {
    if (p.paymentChannel === "in store" && withinWindow(p.date, timeWindow)) {
      present.add(p.category);
    }
  }
  return present;
}

export interface FriendsMapData {
  userId: string;
  userName: string;
  authedUserId: string | undefined;
  selfImage: string | null;
  friendIds: Set<string>;
  friendNameById: Map<string, FriendProfile>;
  friendList: FriendListItem[];
  selfPinsRaw: PinDatum[];
  friendPinsRaw: PinDatum[];
  unmappedInStore: SelfPinSource[];
  presentCategories: Set<Category>;
}

export function useFriendsMapData(timeWindow: TimeWindow): FriendsMapData {
  const session = authClient.useSession();
  const authedUserId = session.data?.user.id;
  const userId = authedUserId ?? DEMO_USER_ID;
  const userName = session.data?.user.name ?? session.data?.user.email?.split("@")[0] ?? "You";

  const [txns] = useQuery(queries.transactions.list());
  const [friendships] = useQuery(queries.social.friendships());
  const [allPosts] = useQuery(queries.social.postsAll());

  const friendIdList = friendships
    .map((f) => (f.userAId === userId ? f.userBId : f.userAId))
    .filter(Boolean) as string[];
  // Include viewer's own id so leaderboard self row has an avatar (anon).
  const profileIds = [...new Set([userId, ...friendIdList].filter(Boolean))] as string[];
  const [friendProfiles] = useQuery(
    queries.social.friendProfiles({
      ids: profileIds.length > 0 ? profileIds : ["__none__"],
    }),
  );
  const friendNameById = new Map<string, FriendProfile>();
  for (const p of friendProfiles) {
    friendNameById.set(p.id, {
      image: p.image ?? null,
      name: profileName(p),
    });
  }
  const selfImage = session.data?.user.image ?? friendNameById.get(userId)?.image ?? null;
  const friendIds = new Set(friendships.map((f) => (f.userAId === userId ? f.userBId : f.userAId)));
  const friendList = buildFriendList(userId, userName, friendIds, friendNameById);

  const friendPosts = allPosts.filter((p) => p.userId !== userId && friendIds.has(p.userId));
  const geoTxns = txns.filter(isGeoTxn);
  const unmappedInStore = txns.filter(isUnmappedInStore) as unknown as SelfPinSource[];

  const selfPinsRaw = geoTxns.map((t) =>
    mapSelfTxnToPin(t as unknown as SelfPinSource, userId, userName, selfImage),
  );
  const friendPinsRaw = friendPosts.map((p) =>
    mapFriendPostToPin(p as unknown as FriendPostSource, friendNameById),
  );
  const presentCategories = computePresentCategories(
    [...selfPinsRaw, ...friendPinsRaw],
    timeWindow,
  );

  return {
    authedUserId,
    friendIds,
    friendList,
    friendNameById,
    friendPinsRaw,
    presentCategories,
    selfImage,
    selfPinsRaw,
    unmappedInStore,
    userId,
    userName,
  };
}
